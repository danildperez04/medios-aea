import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository, type SelectQueryBuilder } from 'typeorm';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import {
  AuditAction,
  RequestStatus,
  ResourceStatus,
  ResourceType,
  UserRole,
} from '#common/enums/domain.enums.js';
import { calendarDateIn } from '#common/utils/calendar.js';
import { toRangeLiteral, type TimeRange } from '#common/utils/time-range.js';
import { AuditLog } from '#modules/audit/entities/audit-log.entity.js';
import {
  driverUnavailableReasons,
  resourceUnavailableReasons,
} from '#modules/availability/availability.rules.js';
import { Blackout } from '#modules/blackouts/entities/blackout.entity.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { NotificationsService } from '#modules/notifications/notifications.service.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { Vehicle } from '#modules/resources/entities/vehicle.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import { driverProblem, resourceProblem, type ApprovalProblem } from './approval.rules.js';
import type { ApproveReservationDto } from './dto/approve-reservation.dto.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { ReassignReservationDto } from './dto/reassign-reservation.dto.js';
import type { RejectReservationDto } from './dto/reject-reservation.dto.js';
import type { ReservationFiltersDto } from './dto/reservation-filters.dto.js';
import { ReservationAssignment } from './entities/reservation-assignment.entity.js';
import { ReservationRequest } from './entities/reservation-request.entity.js';
import { toReservationView, type ReservationView } from './reservation.view.js';
import {
  cancellationError,
  formatRequestCode,
  proposedDriverError,
  requestWindowError,
} from './request.rules.js';

const WHEN = new Intl.DateTimeFormat('es-NI', {
  timeZone: 'America/Managua',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Solicitudes de medios (RF-10 a RF-13 y RF-15; HU-09 a HU-13, HU-26). Una solicitud
 * nueva queda PENDING y no ocupa la agenda (RN-07): solo su asignación aprobada lo hace.
 */
@Injectable()
export class ReservationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateReservationDto, actor: AuthenticatedUser): Promise<ReservationView> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    const windowError = requestWindowError(startsAt, endsAt);
    if (windowError) throw new BadRequestException(windowError);

    const resourceType = dto.resourceType ?? ResourceType.VEHICLE;

    const id = await this.dataSource.transaction(async (manager) => {
      const requester = await this.resolveRequester(
        manager.getRepository(User),
        dto.requesterId,
        actor,
      );

      const project = await manager.findOneBy(Project, { id: dto.projectId });
      if (!project || !project.isActive) {
        throw new BadRequestException(
          'El proyecto no existe o ya está cerrado. Elige un proyecto activo.',
        );
      }

      if (dto.preferredResourceId) {
        const preferred = await manager.findOneBy(Resource, { id: dto.preferredResourceId });
        if (!preferred || preferred.status === ResourceStatus.INACTIVE) {
          throw new BadRequestException('El medio preferido no existe o fue dado de baja.');
        }
        if (preferred.type !== resourceType) {
          throw new BadRequestException('El medio preferido no es del tipo que se solicita.');
        }
      }

      const proposedDriver = await this.resolveProposedDriver(
        manager,
        dto.proposedDriverId,
        requester,
        resourceType,
        endsAt,
      );

      const [{ nextval }] = await manager.query<{ nextval: string }[]>(
        `SELECT nextval('reservation_request_code_seq')`,
      );
      const code = formatRequestCode(
        Number(calendarDateIn(new Date()).slice(0, 4)),
        Number(nextval),
      );

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

      // La coordinación se entera en la misma transacción (HU-09). Push: HU-19.
      await this.notifications.notifyRole(manager, UserRole.ADMIN, {
        title: `Nueva solicitud ${code}`,
        body:
          `${requester.fullName} pide un medio para ${dto.destination} (${WHEN.format(startsAt)} – ${WHEN.format(endsAt)}).` +
          (proposedDriver ? ` Conduce ${proposedDriver.user.fullName}.` : ''),
        data: { kind: 'RESERVATION_CREATED', reservationId: saved.id },
      });

      return saved.id;
    });

    return this.findOneOrFail(id, actor);
  }

  async findAll(
    filters: ReservationFiltersDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<ReservationView>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const query = this.baseQuery();

    // Un técnico solo ve sus solicitudes, sin importar los filtros que mande.
    if (actor.role !== UserRole.ADMIN) {
      query.andWhere('request.requesterId = :me', { me: actor.id });
    }
    if (filters.status) query.andWhere('request.status = :status', { status: filters.status });
    if (filters.from) query.andWhere('request.endsAt > :from', { from: new Date(filters.from) });
    if (filters.to) query.andWhere('request.startsAt < :to', { to: new Date(filters.to) });
    if (filters.search) {
      query.andWhere(
        '(request.code ILIKE :search OR request.destination ILIKE :search OR requester.fullName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Las pendientes, por fecha más próxima (lo que hay que decidir primero);
    // el resto, de la más reciente a la más antigua.
    query.orderBy('request.startsAt', filters.status === RequestStatus.PENDING ? 'ASC' : 'DESC');

    const [rows, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponse(rows.map(toReservationView), total, page, limit);
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
      const { resource, driver } = await this.checkAssignable(
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
      await manager.save(
        manager.create(AuditLog, {
          actorId: actor.id,
          action: AuditAction.APPROVE,
          entity: 'reservation_request',
          entityId: id,
          payload: {
            assignmentId: identifiers[0]?.id as string,
            resourceId: resource.id,
            driverId: driver?.id ?? null,
            proposedDriverId: request.proposedDriverId,
            driverChanged,
          },
        }),
      );

      await this.notifyApproval(manager, request, resource, driver, driverChanged, actor);
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
      await manager.insert(AuditLog, {
        actorId: actor.id,
        action: AuditAction.REJECT,
        entity: 'reservation_request',
        entityId: id,
        payload: { reason: dto.reason },
      });
      if (request.requesterId !== actor.id) {
        await this.notifications.notifyUsers(manager, [request.requesterId], {
          title: `Solicitud ${request.code} rechazada`,
          body: `Tu viaje a ${request.destination} (${WHEN.format(request.startsAt)} – ${WHEN.format(request.endsAt)}) no se aprobó. Motivo: ${dto.reason}`,
          data: { kind: 'RESERVATION_REJECTED', reservationId: id },
        });
      }
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
      const { resource, driver } = await this.checkAssignable(
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

      await manager.save(
        manager.create(AuditLog, {
          actorId: actor.id,
          action: AuditAction.REASSIGN,
          entity: 'reservation_request',
          entityId: id,
          payload: {
            fromAssignmentId: current.id,
            toAssignmentId: identifiers[0]?.id as string,
            from: { resourceId: current.resourceId, driverId: current.driverId },
            to: { resourceId: resource.id, driverId: driver?.id ?? null },
          },
        }),
      );

      await this.notifyReassignment(manager, request, current, resource, driver, actor);
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

      await manager.insert(AuditLog, {
        actorId: actor.id,
        action: AuditAction.CANCEL,
        entity: 'reservation_request',
        entityId: id,
        payload: {
          fromStatus,
          releasedAssignmentIds: assignments.map((assignment) => assignment.id),
        },
      });

      // Se entera quien no canceló: la coordinación, la persona solicitante y
      // el conductor que ya tenía el viaje asignado (RN-10).
      const content = {
        title: `Solicitud ${request.code} cancelada`,
        body: `${actor.fullName} canceló el viaje a ${request.destination} (${WHEN.format(request.startsAt)} – ${WHEN.format(request.endsAt)}).`,
        data: { kind: 'RESERVATION_CANCELLED', reservationId: id },
      };
      if (actor.role !== UserRole.ADMIN) {
        await this.notifications.notifyRole(manager, UserRole.ADMIN, content);
      }
      const others = new Set([
        request.requesterId,
        ...assignments.flatMap((assignment) => assignment.driver?.userId ?? []),
      ]);
      others.delete(actor.id);
      await this.notifications.notifyUsers(manager, [...others], content);
    });

    return this.findOneOrFail(id, actor);
  }

  /**
   * Valida que el medio y el conductor sirvan para la solicitud (RN-01 a RN-05,
   * RN-09) y bloquea la fila del medio con FOR UPDATE, el mismo candado que los
   * bloqueos. `exceptAssignmentId` es la asignación que se está reemplazando al
   * reasignar: la del propio viaje no cuenta como choque.
   */
  private async checkAssignable(
    manager: EntityManager,
    request: ReservationRequest,
    resourceId: string,
    driverId: string | null,
    exceptAssignmentId?: string,
  ): Promise<{ resource: Resource; driver: Driver | null }> {
    const period: TimeRange = { start: request.startsAt, end: request.endsAt };
    const resource = await manager.findOne(Resource, {
      where: { id: resourceId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!resource || resource.status === ResourceStatus.INACTIVE) {
      throw new BadRequestException('El medio no existe o fue dado de baja.');
    }
    if (resource.type !== request.resourceType) {
      throw new BadRequestException('El medio no es del tipo que se solicitó.');
    }
    const vehicle = await manager.findOneBy(Vehicle, { resourceId: resource.id });
    const resourceConflict = await this.firstAssignmentConflict(
      manager,
      period,
      {
        resourceId: resource.id,
      },
      exceptAssignmentId,
    );
    const passengerCapacity = vehicle?.passengerCapacity ?? null;
    throwProblem(
      resourceProblem(
        resourceUnavailableReasons(
          {
            status: resource.status,
            passengerCapacity,
            hasBlackout: await this.hasBlackout(manager, resource.id, period),
            hasAssignment: resourceConflict !== null,
          },
          request.passengers,
        ),
        { name: resource.name, passengerCapacity },
        request.passengers,
        resourceConflict ?? undefined,
      ),
    );

    if (!driverId && request.resourceType === ResourceType.VEHICLE) {
      throw new BadRequestException('Elige quién conduce: la solicitud no indica a nadie.');
    }
    // También se bloquea la fila del conductor, siempre después del medio: dos
    // aprobaciones con la misma persona en medios distintos se ordenan aquí y la segunda
    // ve el viaje de la primera (409 claro). Sin esto, cada una bloqueaba su medio,
    // ambas insertaban y se esperaban en la restricción de exclusión: deadlock y 500.
    const locked = driverId
      ? await manager.findOne(Driver, {
          where: { id: driverId },
          lock: { mode: 'pessimistic_write' },
        })
      : null;
    if (driverId && !locked) throw new BadRequestException('El conductor no existe.');
    const driver = locked
      ? Object.assign(locked, { user: await manager.findOneByOrFail(User, { id: locked.userId }) })
      : null;
    if (driver) {
      const driverConflict = await this.firstAssignmentConflict(
        manager,
        period,
        {
          driverId: driver.id,
        },
        exceptAssignmentId,
      );
      throwProblem(
        driverProblem(
          driverUnavailableReasons(
            {
              isActive: driver.isActive && driver.user.isActive,
              licenseExpiry: driver.licenseExpiry,
              hasAssignment: driverConflict !== null,
            },
            period,
          ),
          { fullName: driver.user.fullName, licenseExpiry: driver.licenseExpiry },
          driverConflict ?? undefined,
        ),
      );
    }
    return { resource, driver };
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

  /**
   * Avisos de una aprobación: a quien pidió, a quien conduce (si es otra persona) y,
   * si la coordinación cambió al conductor, a quien había sido propuesto.
   */
  private async notifyApproval(
    manager: EntityManager,
    request: ReservationRequest,
    resource: Resource,
    driver: Driver | null,
    driverChanged: boolean,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const when = `${WHEN.format(request.startsAt)} – ${WHEN.format(request.endsAt)}`;
    const data = { kind: 'RESERVATION_APPROVED', reservationId: request.id };
    const who =
      driver && driver.userId === request.requesterId
        ? 'conduces tú'
        : driver
          ? `conduce ${driver.user.fullName}`
          : 'sin conductor';
    const notify = async (
      userId: string | undefined,
      title: string,
      body: string,
    ): Promise<void> => {
      if (userId && userId !== actor.id) {
        await this.notifications.notifyUsers(manager, [userId], { title, body, data });
      }
    };

    await notify(
      request.requesterId,
      `Solicitud ${request.code} aprobada`,
      `Tu viaje a ${request.destination} (${when}) va en ${resource.name}; ${who}.` +
        (driverChanged ? ' La coordinación cambió a quien conduce.' : ''),
    );
    if (driver && driver.userId !== request.requesterId) {
      await notify(
        driver.userId,
        `Tienes un viaje asignado: ${request.code}`,
        `${request.destination} (${when}) en ${resource.name}.`,
      );
    }
    if (driverChanged && request.proposedDriverId) {
      const proposed = await manager.findOneBy(Driver, { id: request.proposedDriverId });
      if (proposed && proposed.userId !== request.requesterId) {
        await notify(
          proposed.userId,
          `Ya no conduces el viaje ${request.code}`,
          `La coordinación asignó a ${driver?.user.fullName ?? 'otra persona'} para ${request.destination} (${when}).`,
        );
      }
    }
  }

  /**
   * Avisos de una reasignación (RN-10): a quien pidió, a quien conduce ahora y, si
   * cambió la persona, a quien conducía. Si solo cambió el medio, quien conduce se
   * entera de en qué medio va.
   */
  private async notifyReassignment(
    manager: EntityManager,
    request: ReservationRequest,
    previous: ReservationAssignment,
    resource: Resource,
    driver: Driver | null,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const when = `${WHEN.format(request.startsAt)} – ${WHEN.format(request.endsAt)}`;
    const data = { kind: 'RESERVATION_REASSIGNED', reservationId: request.id };
    const driverChanged = previous.driverId !== (driver?.id ?? null);
    const sent = new Set<string>([actor.id]);
    const notify = async (
      userId: string | undefined,
      title: string,
      body: string,
    ): Promise<void> => {
      if (!userId || sent.has(userId)) return;
      sent.add(userId);
      await this.notifications.notifyUsers(manager, [userId], { title, body, data });
    };

    const who =
      driver && driver.userId === request.requesterId
        ? 'conduces tú'
        : driver
          ? `conduce ${driver.user.fullName}`
          : 'sin conductor';
    await notify(
      request.requesterId,
      `Cambió tu viaje ${request.code}`,
      `${request.destination} (${when}): ahora va en ${resource.name}; ${who}.`,
    );
    if (driverChanged) {
      await notify(
        driver?.userId,
        `Tienes un viaje asignado: ${request.code}`,
        `${request.destination} (${when}) en ${resource.name}.`,
      );
      await notify(
        previous.driver?.userId,
        `Ya no conduces el viaje ${request.code}`,
        `La coordinación asignó a ${driver?.user.fullName ?? 'otra persona'} para ${request.destination} (${when}).`,
      );
    } else {
      await notify(
        driver?.userId,
        `Cambió el medio del viaje ${request.code}`,
        `${request.destination} (${when}): ahora va en ${resource.name}.`,
      );
    }
  }

  /**
   * Primera asignación activa del medio o del conductor que se cruza con el periodo,
   * como "SOL-2026-00042, El Rosario"; null si no hay. Semiabierto `[)` (RN-03).
   */
  private async firstAssignmentConflict(
    manager: EntityManager,
    period: TimeRange,
    who: { resourceId: string } | { driverId: string },
    exceptAssignmentId?: string,
  ): Promise<string | null> {
    const query = manager
      .createQueryBuilder(ReservationAssignment, 'assignment')
      .innerJoinAndSelect('assignment.request', 'request')
      .where('assignment.active = true')
      .andWhere('assignment.period && CAST(:range AS tstzrange)', {
        range: toRangeLiteral(period),
      });
    if (exceptAssignmentId) {
      query.andWhere('assignment.id <> :exceptAssignmentId', { exceptAssignmentId });
    }
    if ('resourceId' in who) {
      query.andWhere('assignment.resourceId = :resourceId', { resourceId: who.resourceId });
    } else {
      query.andWhere('assignment.driverId = :driverId', { driverId: who.driverId });
    }
    const conflict = await query.orderBy('lower(assignment.period)', 'ASC').getOne();
    return conflict ? `${conflict.request.code}, ${conflict.request.destination}` : null;
  }

  private async hasBlackout(
    manager: EntityManager,
    resourceId: string,
    period: TimeRange,
  ): Promise<boolean> {
    return manager
      .createQueryBuilder(Blackout, 'blackout')
      .where('blackout.resourceId = :resourceId', { resourceId })
      .andWhere('blackout.period && CAST(:range AS tstzrange)', { range: toRangeLiteral(period) })
      .getExists();
  }

  /** Quien no es dueño ni ADMIN recibe 404: no se revela que la solicitud existe. */
  async findOneOrFail(id: string, actor: AuthenticatedUser): Promise<ReservationView> {
    const request = await this.baseQuery().where('request.id = :id', { id }).getOne();
    if (!request || (actor.role !== UserRole.ADMIN && request.requesterId !== actor.id)) {
      throw new NotFoundException('La solicitud no existe.');
    }
    return toReservationView(request);
  }

  private baseQuery(): SelectQueryBuilder<ReservationRequest> {
    return this.dataSource
      .getRepository(ReservationRequest)
      .createQueryBuilder('request')
      .innerJoinAndSelect('request.project', 'project')
      .innerJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.preferredResource', 'preferred')
      .leftJoinAndSelect('preferred.vehicle', 'preferredVehicle')
      .leftJoinAndSelect('request.proposedDriver', 'proposedDriver')
      .leftJoinAndSelect('proposedDriver.user', 'proposedDriverUser')
      .leftJoinAndSelect('request.assignments', 'assignment', 'assignment.active = true')
      .leftJoinAndSelect('assignment.resource', 'assignedResource')
      .leftJoinAndSelect('assignedResource.vehicle', 'assignedVehicle')
      .leftJoinAndSelect('assignment.driver', 'assignedDriver')
      .leftJoinAndSelect('assignedDriver.user', 'assignedDriverUser');
  }

  /**
   * RN-15 (ADR 0004): quien solicita propone quién conduce. Si no lo dice y es un
   * vehículo, conduce la persona solicitante, que debe tener licencia registrada.
   */
  private async resolveProposedDriver(
    manager: EntityManager,
    proposedDriverId: string | undefined,
    requester: User,
    resourceType: ResourceType,
    endsAt: Date,
  ): Promise<Driver | null> {
    if (!proposedDriverId && resourceType !== ResourceType.VEHICLE) return null;

    const driver = await manager.findOne(Driver, {
      where: proposedDriverId ? { id: proposedDriverId } : { userId: requester.id },
      relations: { user: true },
    });
    if (!driver && !proposedDriverId) {
      throw new BadRequestException(
        `Indica quién conduce: ${requester.fullName} no tiene licencia registrada.`,
      );
    }
    const error = proposedDriverError(driver, endsAt);
    if (error) throw new BadRequestException(error);
    return driver;
  }

  /** RN-14: solo la coordinación puede pedir en nombre de otra persona. */
  private async resolveRequester(
    users: Repository<User>,
    requesterId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<User> {
    if (requesterId && requesterId !== actor.id && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo la coordinación puede crear solicitudes en nombre de otra persona.',
      );
    }
    const user = await users.findOneBy({ id: requesterId ?? actor.id });
    if (!user || !user.isActive) {
      throw new BadRequestException('La persona solicitante no existe o está desactivada.');
    }
    return user;
  }
}

function throwProblem(problem: ApprovalProblem | null): void {
  if (problem) throw new HttpException(problem.message, problem.status);
}
