import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import { RequestStatus } from '#common/enums/domain.enums.js';
import { calendarDateIn } from '#common/utils/calendar.js';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';
import { toTripView, type TripView } from './trip.view.js';

/** Viajes que se listan como máximo: una persona rara vez tiene más de unos pocos. */
const MAX_TRIPS = 100;

/**
 * "Mis viajes" (RF-21, HU-20). Un viaje es la asignación activa de una solicitud
 * aprobada, y es de quien está asignado como conductor, tenga el rol que tenga (RN-16,
 * ADR 0004): no depende de la licencia de hoy, sino de la asignación.
 */
@Injectable()
export class TripsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Los de hoy y los próximos, del más cercano al más lejano. También los que siguen
   * en curso aunque haya pasado su hora de regreso: falta registrar la llegada.
   */
  async mine(userId: string, now: Date = new Date()): Promise<TripView[]> {
    const startOfToday = new Date(`${calendarDateIn(now)}T00:00:00-06:00`);
    const rows = await this.query(userId)
      .andWhere('request.status = :approved', { approved: RequestStatus.APPROVED })
      .andWhere(
        '(request.endsAt >= :startOfToday OR (trip.id IS NOT NULL AND trip.finishedAt IS NULL))',
        { startOfToday },
      )
      .orderBy('request.startsAt', 'ASC')
      .take(MAX_TRIPS)
      .getMany();
    return rows.map(toTripView);
  }

  /** Un viaje propio, por su solicitud. Si no lo conduce esta persona, 404. */
  async mineByReservation(userId: string, reservationId: string): Promise<TripView> {
    const row = await this.query(userId)
      .andWhere('request.id = :reservationId', { reservationId })
      .getOne();
    if (!row) throw new NotFoundException('No tienes asignado ese viaje.');
    return toTripView(row);
  }

  private query(userId: string): SelectQueryBuilder<ReservationAssignment> {
    return this.dataSource
      .getRepository(ReservationAssignment)
      .createQueryBuilder('assignment')
      .innerJoin('assignment.driver', 'driver')
      .innerJoinAndSelect('assignment.request', 'request')
      .innerJoinAndSelect('request.project', 'project')
      .innerJoinAndSelect('request.requester', 'requester')
      .innerJoinAndSelect('assignment.resource', 'resource')
      .leftJoinAndSelect('resource.vehicle', 'vehicle')
      .leftJoinAndSelect('assignment.trip', 'trip')
      .where('assignment.active = true')
      .andWhere('driver.userId = :userId', { userId });
  }
}
