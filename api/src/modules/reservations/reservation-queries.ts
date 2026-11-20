import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { RequestStatus, UserRole } from '#common/enums/domain.enums.js';
import type { ReservationFiltersDto } from './dto/reservation-filters.dto.js';
import { ReservationRequest } from './entities/reservation-request.entity.js';
import { toReservationView, type ReservationView } from './reservation.view.js';

/** Lectura de solicitudes (HU-09, HU-18): cada técnico solo ve las suyas. */
@Injectable()
export class ReservationQueries {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(
    filters: ReservationFiltersDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<ReservationView>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const query = this.baseQuery();

    // Un técnico solo ve sus solicitudes, sin importar los filtros que mande. La
    // coordinación ve todas, salvo que pida solo las suyas (la app, HU-18).
    if (actor.role !== UserRole.ADMIN || filters.mine) {
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
      .leftJoinAndSelect('preferred.vehicle', 'preferredVehicle')
      .leftJoinAndSelect('request.proposedDriver', 'proposedDriver')
      .leftJoinAndSelect('proposedDriver.user', 'proposedDriverUser')
      .leftJoinAndSelect('request.assignments', 'assignment', 'assignment.active = true')
      .leftJoinAndSelect('assignment.resource', 'assignedResource')
      .leftJoinAndSelect('assignedResource.vehicle', 'assignedVehicle')
      .leftJoinAndSelect('assignment.driver', 'assignedDriver')
      .leftJoinAndSelect('assignedDriver.user', 'assignedDriverUser');
  }
}
