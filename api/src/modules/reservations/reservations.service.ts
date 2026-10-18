import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type Repository, type SelectQueryBuilder } from 'typeorm';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import {
  RequestStatus,
  ResourceStatus,
  ResourceType,
  UserRole,
} from '#common/enums/domain.enums.js';
import { calendarDateIn } from '#common/utils/calendar.js';
import { NotificationsService } from '#modules/notifications/notifications.service.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { ReservationFiltersDto } from './dto/reservation-filters.dto.js';
import { ReservationRequest } from './entities/reservation-request.entity.js';
import { toReservationView, type ReservationView } from './reservation.view.js';
import { formatRequestCode, requestWindowError } from './request.rules.js';

const WHEN = new Intl.DateTimeFormat('es-NI', {
  timeZone: 'America/Managua',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Solicitudes de medios (RF-10, HU-09). Una solicitud nueva queda PENDING y no
 * ocupa la agenda (RN-07): solo su asignación aprobada lo hace (HU-11).
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
        body: `${requester.fullName} pide un medio para ${dto.destination} (${WHEN.format(startsAt)} – ${WHEN.format(endsAt)}).`,
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
      .leftJoinAndSelect('preferred.vehicle', 'preferredVehicle');
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
