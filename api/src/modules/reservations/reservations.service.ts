import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import type { PaginatedResponse } from '#common/dto/pagination.dto.js';
import {
  AuditAction,
  RequestStatus,
  ResourceStatus,
  ResourceType,
  UserRole,
} from '#common/enums/domain.enums.js';
import type { TimeRange } from '#common/utils/time-range.js';
import { AuditLog } from '#modules/audit/entities/audit-log.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { AssignmentChecker } from './assignment-checker.js';
import type { ApproveReservationDto } from './dto/approve-reservation.dto.js';
import type { BookReservationDto } from './dto/book-reservation.dto.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { ReassignReservationDto } from './dto/reassign-reservation.dto.js';
import type { RejectReservationDto } from './dto/reject-reservation.dto.js';
import type { ReservationFiltersDto } from './dto/reservation-filters.dto.js';
import { ReservationAssignment } from './entities/reservation-assignment.entity.js';
import { ReservationRequest } from './entities/reservation-request.entity.js';
import { ReservationNotices } from './reservation-notices.js';
import { ReservationQueries } from './reservation-queries.js';
import type { ReservationView } from './reservation.view.js';
import { RequestParties } from './request-parties.js';
import { cancellationError, requestWindowError } from './request.rules.js';

/**
 * Ciclo de vida de una solicitud de medios (RF-10 a RF-13 y RF-15; HU-09 a HU-13, HU-26,
 * HU-27): crear, reservar, aprobar, rechazar, reasignar y cancelar, cada uno en su
 * transacción y con su registro en la auditoría. Una solicitud nueva queda PENDING y no
 * ocupa la agenda (RN-07): solo su asignación aprobada lo hace.
 *
 * Las piezas que comparten esos pasos viven aparte: `AssignmentChecker` (choques y
 * candados de medio y conductor), `ReservationNotices` (qué se avisa a quién),
 * `RequestParties` (quién pide, proyecto, quién conduce, código) y `ReservationQueries`
 * (lectura).
 */
@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(AssignmentChecker) private readonly assignments: AssignmentChecker,
    @Inject(ReservationNotices) private readonly notices: ReservationNotices,
    @Inject(RequestParties) private readonly parties: RequestParties,
    @Inject(ReservationQueries) private readonly queries: ReservationQueries,
  ) {}

  async create(dto: CreateReservationDto, actor: AuthenticatedUser): Promise<ReservationView> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const windowError = requestWindowError(startsAt, endsAt);
    if (windowError) throw new BadRequestException(windowError);

    const resourceType = dto.resourceType ?? ResourceType.VEHICLE;

    const id = await this.dataSource.transaction(async (manager) => {
      const { requester, project } = await this.parties.resolve(manager, dto, actor);

      if (dto.preferredResourceId) {
        const preferred = await manager.findOneBy(Resource, { id: dto.preferredResourceId });
        if (!preferred || preferred.status === ResourceStatus.INACTIVE) {
          throw new BadRequestException('El medio preferido no existe o fue dado de baja.');
        }
        if (preferred.type !== resourceType) {
          throw new BadRequestException('El medio preferido no es del tipo que se solicita.');
        }
      }

      const proposedDriver = await this.parties.proposedDriver(
        manager,
        dto.proposedDriverId,
        requester,
        resourceType,
        endsAt,
      );

      const code = await this.parties.nextCode(manager);

      const saved = await manager.save(
        manager.create(ReservationRequest, {
          code,
          requesterId: requester.id,
          projectId: project.id,
          resourceType,
          preferredResourceId: dto.preferredResourceId ?? null,
          proposedDriverId: proposedDriver?.id ?? null,
          purpose: dto.purpose,
          destination: dto.destination,
          passengers: dto.passengers,
          startsAt,
          endsAt,
          status: RequestStatus.PENDING,
        }),
      );

      // La coordinación se entera en la misma transacción (HU-09).
      await this.notices.created(manager, saved, requester, proposedDriver);

      return saved.id;
    });

    return this.findOneOrFail(id, actor);
  }

  /**
   * La coordinación registra una reserva ya aprobada (HU-27, RF-10, RF-12): no pasa
   * por la bandeja. Valida lo mismo que crear (RN-06, RN-14) y que aprobar (RN-01 a
   * RN-05, RN-09) con `checkAssignable`, en una sola transacción. La solicitud es
   * nueva, así que nadie más la bloquea; el orden de candados sigue siendo medio y
   * luego conductor, y la restricción de exclusión es la garantía final (409).
   */
  async book(dto: BookReservationDto, actor: AuthenticatedUser): Promise<ReservationView> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const windowError = requestWindowError(startsAt, endsAt);
    if (windowError) throw new BadRequestException(windowError);

    const id = await this.dataSource.transaction(async (manager) => {
      const { requester, project } = await this.parties.resolve(manager, dto, actor);
      const draft = manager.create(ReservationRequest, {
        requesterId: requester.id,
        projectId: project.id,
        resourceType: dto.resourceType ?? ResourceType.VEHICLE,
        preferredResourceId: null,
        purpose: dto.purpose,
        destination: dto.destination,
        passengers: dto.passengers,
        startsAt,
        endsAt,
      });
      const { resource, driver } = await this.assignments.check(
        manager,
        draft,
        dto.resourceId,
        dto.driverId ?? null,
      );

      // Quien conduce queda también como propuesto: así la vista y los avisos no lo
      // tratan como un cambio de la coordinación.
      const saved = await manager.save(
        Object.assign(draft, {
          code: await this.parties.nextCode(manager),
          proposedDriverId: driver?.id ?? null,
          status: RequestStatus.APPROVED,
          decidedById: actor.id,
          decidedAt: new Date(),
        }),
      );
      const { identifiers } = await manager.insert(ReservationAssignment, {
        requestId: saved.id,
        resourceId: resource.id,
        driverId: driver?.id ?? null,
        period: { start: startsAt, end: endsAt },
        active: true,
      });

      // En la auditoría es una aprobación (HU-15 la mostrará igual), marcada como directa.
      await this.audit(manager, actor, AuditAction.APPROVE, saved.id, {
        direct: true,
        assignmentId: identifiers[0]?.id as string,
        resourceId: resource.id,
        driverId: driver?.id ?? null,
        proposedDriverId: null,
        driverChanged: false,
      });

      await this.notices.approved(manager, saved, resource, driver, false, actor, true);
      return saved.id;
    });

    return this.findOneOrFail(id, actor);
  }

  findAll(
    filters: ReservationFiltersDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<ReservationView>> {
    return this.queries.findAll(filters, actor);
  }

  findOneOrFail(id: string, actor: AuthenticatedUser): Promise<ReservationView> {
    return this.queries.findOneOrFail(id, actor);
  }

  /**
   * Aprueba una solicitud pendiente asignando medio y conductor (RF-12, HU-11).
   * El conductor es el propuesto por quien solicita salvo que la coordinación elija
   * a otra persona; entonces se avisa a ambos (ADR 0004).
   *
   * Todo ocurre en una transacción (RN-08). La solicitud y el medio se bloquean con
   * FOR UPDATE: el del medio es el mismo candado que toman los bloqueos, así que
   * una aprobación y un bloqueo del mismo medio se serializan (docs/10 §4). Los
   * choques se validan antes para dar un buen mensaje, pero la garantía es la
   * restricción de exclusión: si dos aprobaciones se cruzan con el mismo conductor
   * en medios distintos, la segunda inserción falla con 23P01 y responde 409.
   */
  async approve(
    id: string,
    dto: ApproveReservationDto,
    actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    await this.dataSource.transaction(async (manager) => {
      const request = await this.lockPending(manager, id);
      const period: TimeRange = { start: request.startsAt, end: request.endsAt };
      const { resource, driver } = await this.assignments.check(
        manager,
        request,
        dto.resourceId,
        dto.driverId ?? request.proposedDriverId,
      );

      const { identifiers } = await manager.insert(ReservationAssignment, {
        requestId: id,
        resourceId: resource.id,
        driverId: driver?.id ?? null,
        period,
        active: true,
      });
      await manager.update(ReservationRequest, id, {
        status: RequestStatus.APPROVED,
        decidedById: actor.id,
        decidedAt: new Date(),
      });

      const driverChanged = Boolean(
        request.proposedDriverId && driver && driver.id !== request.proposedDriverId,
      );
      await this.audit(manager, actor, AuditAction.APPROVE, id, {
        assignmentId: identifiers[0]?.id as string,
        resourceId: resource.id,
        driverId: driver?.id ?? null,
        proposedDriverId: request.proposedDriverId,
        driverChanged,
      });

      await this.notices.approved(manager, request, resource, driver, driverChanged, actor);
    });

    return this.findOneOrFail(id, actor);
  }

  /**
   * Rechaza una solicitud pendiente con un motivo que lee quien pidió (RF-13, HU-12).
   * Bloquea la solicitud igual que aprobar: si dos personas de la coordinación la
   * deciden a la vez, la segunda recibe 409. No hay asignación que liberar (RN-07).
   */
  async reject(
    id: string,
    dto: RejectReservationDto,
    actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    await this.dataSource.transaction(async (manager) => {
      const request = await this.lockPending(manager, id);
      await manager.update(ReservationRequest, id, {
        status: RequestStatus.REJECTED,
        rejectionReason: dto.reason,
        decidedById: actor.id,
        decidedAt: new Date(),
      });
      await this.audit(manager, actor, AuditAction.REJECT, id, { reason: dto.reason });
      await this.notices.rejected(manager, request, dto.reason, actor);
    });

    return this.findOneOrFail(id, actor);
  }

  /**
   * Reasigna el medio, quien conduce o ambos de una solicitud aprobada (RF-15, HU-13).
   * En una transacción la asignación vigente pasa a `active = false` (no se borra,
   * RN-10) y se crea otra con las mismas validaciones que al aprobar. No se reasigna
   * un viaje que ya inició: la bitácora está atada a su asignación.
   */
  async reassign(
    id: string,
    dto: ReassignReservationDto,
    actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(ReservationRequest, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) throw new NotFoundException('La solicitud no existe.');
      if (request.status !== RequestStatus.APPROVED) {
        throw new ConflictException(
          'Solo se reasigna una solicitud aprobada. Si está pendiente, apruébala con el medio y la persona que quieras.',
        );
      }
      const current = await manager.findOne(ReservationAssignment, {
        where: { requestId: id, active: true },
        relations: { trip: true, driver: { user: true } },
      });
      if (!current) throw new ConflictException('La solicitud no tiene una asignación vigente.');
      if (current.trip) {
        throw new ConflictException(
          'El viaje ya inició; no se puede reasignar. Pide al conductor que registre la llegada.',
        );
      }

      const resourceId = dto.resourceId ?? current.resourceId;
      const driverId = dto.driverId ?? current.driverId;
      if (resourceId === current.resourceId && driverId === current.driverId) {
        throw new BadRequestException(
          'No hay cambios: elige otro medio o a otra persona para conducir.',
        );
      }
      const { resource, driver } = await this.assignments.check(
        manager,
        request,
        resourceId,
        driverId,
        current.id,
      );

      // Primero se libera la vigente: así la nueva no choca consigo misma en la
      // restricción de exclusión, que sigue siendo la garantía ante otra aprobación.
      await manager.update(ReservationAssignment, current.id, { active: false });
      const { identifiers } = await manager.insert(ReservationAssignment, {
        requestId: id,
        resourceId: resource.id,
        driverId: driver?.id ?? null,
        period: { start: request.startsAt, end: request.endsAt },
        active: true,
      });

      await this.audit(manager, actor, AuditAction.REASSIGN, id, {
        fromAssignmentId: current.id,
        toAssignmentId: identifiers[0]?.id as string,
        from: { resourceId: current.resourceId, driverId: current.driverId },
        to: { resourceId: resource.id, driverId: driver?.id ?? null },
      });

      await this.notices.reassigned(manager, request, current, resource, driver, actor);
    });

    return this.findOneOrFail(id, actor);
  }

  /**
   * Cancela una solicitud pendiente o aprobada (RF-11, HU-10). Solo su dueño o
   * la coordinación (RN-13). Si estaba aprobada, sus asignaciones pasan a
   * `active = false` y el medio y el conductor quedan libres (RN-10).
   *
   * La fila de la solicitud se bloquea con FOR UPDATE: una aprobación (HU-11) o
   * el inicio del viaje (HU-21) de la misma solicitud esperan a que esto termine.
   */
  async cancel(id: string, actor: AuthenticatedUser): Promise<ReservationView> {
    await this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(ReservationRequest, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request || (actor.role !== UserRole.ADMIN && request.requesterId !== actor.id)) {
        throw new NotFoundException('La solicitud no existe.');
      }

      const assignments = await manager.find(ReservationAssignment, {
        where: { requestId: id, active: true },
        relations: { trip: true, driver: true },
      });
      const fromStatus = request.status;
      const error = cancellationError(
        fromStatus,
        assignments.some((assignment) => assignment.trip),
      );
      if (error) throw new ConflictException(error);

      if (assignments.length) {
        await manager.update(
          ReservationAssignment,
          assignments.map((assignment) => assignment.id),
          { active: false },
        );
      }
      await manager.update(ReservationRequest, id, { status: RequestStatus.CANCELLED });

      await this.audit(manager, actor, AuditAction.CANCEL, id, {
        fromStatus,
        releasedAssignmentIds: assignments.map((assignment) => assignment.id),
      });

      await this.notices.cancelled(manager, request, assignments, actor);
    });

    return this.findOneOrFail(id, actor);
  }

  /** Deja el paso en `audit_log`, dentro de la misma transacción (RF-17, HU-15). */
  private async audit(
    manager: EntityManager,
    actor: AuthenticatedUser,
    action: AuditAction,
    requestId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await manager.save(
      manager.create(AuditLog, {
        actorId: actor.id,
        action,
        entity: 'reservation_request',
        entityId: requestId,
        payload,
      }),
    );
  }

  /**
   * Bloquea la solicitud con FOR UPDATE y exige que siga pendiente: aprobar y
   * rechazar solo deciden una vez, aunque dos personas lo intenten a la vez.
   */
  private async lockPending(manager: EntityManager, id: string): Promise<ReservationRequest> {
    const request = await manager.findOne(ReservationRequest, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!request) throw new NotFoundException('La solicitud no existe.');
    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException(
        'La solicitud ya no está pendiente: otra persona la decidió o se canceló. Recarga la bandeja.',
      );
    }
    return request;
  }
}
