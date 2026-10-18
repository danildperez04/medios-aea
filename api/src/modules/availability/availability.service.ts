import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RequestStatus, ResourceStatus, ResourceType } from '#common/enums/domain.enums.js';
import { toRangeLiteral, type TimeRange } from '#common/utils/time-range.js';
import { Blackout } from '#modules/blackouts/entities/blackout.entity.js';
import { toDriverView, type DriverView } from '#modules/drivers/driver.view.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';
import { ReservationRequest } from '#modules/reservations/entities/reservation-request.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import {
  driverUnavailableReasons,
  resourceUnavailableReasons,
  type DriverUnavailableReason,
  type ResourceUnavailableReason,
} from './availability.rules.js';

/** Un medio en una respuesta de disponibilidad o agenda, sin importar su tipo. */
export interface ResourceSummary {
  id: string;
  type: ResourceType;
  name: string;
  status: ResourceStatus;
  /** Placa para vehículos; el nombre para medios sin identificador propio. */
  identifier: string;
  passengerCapacity: number | null;
}

export interface ResourceAvailability {
  from: Date;
  to: Date;
  available: ResourceSummary[];
  unavailable: { resource: ResourceSummary; reasons: ResourceUnavailableReason[] }[];
}

export interface DriverAvailability {
  from: Date;
  to: Date;
  available: DriverView[];
  unavailable: { driver: DriverView; reasons: DriverUnavailableReason[] }[];
}

/** Estado de un bloque en la agenda; coincide con `AgendaBlockState` de la web. */
export type AgendaBlockState = 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING' | 'UNAVAILABLE';

export interface AgendaBlock {
  id: string;
  source: 'ASSIGNMENT' | 'BLACKOUT' | 'REQUEST' | 'STATUS';
  start: Date;
  end: Date;
  state: AgendaBlockState;
  label: string;
}

export interface Agenda {
  from: Date;
  to: Date;
  rows: (ResourceSummary & { blocks: AgendaBlock[] })[];
}

const BLACKOUT_LABEL: Record<Blackout['reason'], string> = {
  MAINTENANCE: 'Mantenimiento',
  ADMINISTRATIVE: 'Uso administrativo',
  OTHER: 'No disponible',
};

/**
 * Consultas de solo lectura sobre la ocupación de los medios (RF-09, RF-16).
 * Las reglas de "por qué no está disponible" viven en availability.rules.ts.
 */
@Injectable()
export class AvailabilityService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resources(
    range: TimeRange,
    type: ResourceType = ResourceType.VEHICLE,
    passengers?: number,
  ): Promise<ResourceAvailability> {
    const resources = await this.loadResources(type);
    const ids = resources.map((resource) => resource.id);
    const busy = new Set((await this.assignmentsIn(ids, range)).map((a) => a.resourceId));
    const blocked = new Set((await this.blackoutsIn(ids, range)).map((b) => b.resourceId));

    const result: ResourceAvailability = {
      from: range.start,
      to: range.end,
      available: [],
      unavailable: [],
    };
    for (const resource of resources) {
      const reasons = resourceUnavailableReasons(
        {
          status: resource.status,
          passengerCapacity: resource.passengerCapacity,
          hasBlackout: blocked.has(resource.id),
          hasAssignment: busy.has(resource.id),
        },
        passengers,
      );
      if (reasons.length) result.unavailable.push({ resource, reasons });
      else result.available.push(resource);
    }
    return result;
  }

  async drivers(range: TimeRange): Promise<DriverAvailability> {
    const drivers = await this.dataSource
      .getRepository(Driver)
      .find({ relations: { user: true }, order: { user: { fullName: 'ASC' } } });
    const busy = new Set(
      (
        await this.dataSource
          .createQueryBuilder(ReservationAssignment, 'assignment')
          .select('assignment.driverId', 'driverId')
          .where('assignment.active = true AND assignment.driverId IS NOT NULL')
          .andWhere('assignment.period && CAST(:range AS tstzrange)', {
            range: toRangeLiteral(range),
          })
          .getRawMany<{ driverId: string }>()
      ).map((row) => row.driverId),
    );

    const result: DriverAvailability = {
      from: range.start,
      to: range.end,
      available: [],
      unavailable: [],
    };
    for (const driver of drivers) {
      const view = toDriverView(driver);
      const reasons = driverUnavailableReasons(
        {
          isActive: view.isActive,
          licenseExpiry: view.licenseExpiry,
          hasAssignment: busy.has(driver.id),
        },
        range,
      );
      if (reasons.length) result.unavailable.push({ driver: view, reasons });
      else result.available.push(view);
    }
    return result;
  }

  /** Agenda de todos los medios que no están dados de baja (cualquier tipo). */
  async agenda(range: TimeRange): Promise<Agenda> {
    const resources = await this.loadResources();
    const ids = resources.map((resource) => resource.id);
    const assignments = await this.assignmentsIn(ids, range, true);
    const blackouts = await this.blackoutsIn(ids, range);
    const pending = ids.length
      ? await this.dataSource
          .createQueryBuilder(ReservationRequest, 'request')
          .where('request.status = :status', { status: RequestStatus.PENDING })
          .andWhere('request.preferredResourceId IN (:...ids)', { ids })
          .andWhere(
            `tstzrange(request.startsAt, request.endsAt, '[)') && CAST(:range AS tstzrange)`,
            {
              range: toRangeLiteral(range),
            },
          )
          .getMany()
      : [];

    const rows = resources.map((resource) => {
      const blocks: AgendaBlock[] = [];
      if (resource.status === ResourceStatus.MAINTENANCE) {
        blocks.push({
          id: `status-${resource.id}`,
          source: 'STATUS',
          start: range.start,
          end: range.end,
          state: 'UNAVAILABLE',
          label: 'En mantenimiento',
        });
      }
      for (const blackout of blackouts.filter((b) => b.resourceId === resource.id)) {
        blocks.push({
          id: blackout.id,
          source: 'BLACKOUT',
          start: blackout.period.start,
          end: blackout.period.end,
          state: 'UNAVAILABLE',
          label: blackout.description || BLACKOUT_LABEL[blackout.reason],
        });
      }
      for (const assignment of assignments.filter((a) => a.resourceId === resource.id)) {
        const trip = assignment.trip;
        blocks.push({
          id: assignment.id,
          source: 'ASSIGNMENT',
          start: assignment.period.start,
          end: assignment.period.end,
          state: trip && !trip.finishedAt ? 'IN_PROGRESS' : 'ASSIGNED',
          label: `${assignment.request.destination} · ${assignment.request.requester.fullName}`,
        });
      }
      for (const request of pending.filter((r) => r.preferredResourceId === resource.id)) {
        blocks.push({
          id: request.id,
          source: 'REQUEST',
          start: request.startsAt,
          end: request.endsAt,
          state: 'PENDING',
          label: request.destination,
        });
      }
      blocks.sort((a, b) => a.start.getTime() - b.start.getTime());
      return { ...resource, blocks };
    });

    return { from: range.start, to: range.end, rows };
  }

  /** Medios que no están dados de baja, con su identificador y capacidad si los tienen. */
  private async loadResources(type?: ResourceType): Promise<ResourceSummary[]> {
    const query = this.dataSource
      .getRepository(Resource)
      .createQueryBuilder('resource')
      .leftJoinAndSelect('resource.vehicle', 'vehicle')
      .where('resource.status <> :inactive', { inactive: ResourceStatus.INACTIVE });
    if (type) query.andWhere('resource.type = :type', { type });
    const resources = await query.orderBy('resource.name', 'ASC').getMany();
    return resources.map((resource) => ({
      id: resource.id,
      type: resource.type,
      name: resource.name,
      status: resource.status,
      identifier: resource.vehicle?.plate ?? resource.name,
      passengerCapacity: resource.vehicle?.passengerCapacity ?? null,
    }));
  }

  private async assignmentsIn(
    resourceIds: string[],
    range: TimeRange,
    withDetails = false,
  ): Promise<ReservationAssignment[]> {
    if (!resourceIds.length) return [];
    const query = this.dataSource
      .createQueryBuilder(ReservationAssignment, 'assignment')
      .where('assignment.active = true')
      .andWhere('assignment.resourceId IN (:...resourceIds)', { resourceIds })
      .andWhere('assignment.period && CAST(:range AS tstzrange)', { range: toRangeLiteral(range) });
    if (withDetails) {
      query
        .innerJoinAndSelect('assignment.request', 'request')
        .innerJoinAndSelect('request.requester', 'requester')
        .leftJoinAndSelect('assignment.trip', 'trip');
    }
    return query.getMany();
  }

  private async blackoutsIn(resourceIds: string[], range: TimeRange): Promise<Blackout[]> {
    if (!resourceIds.length) return [];
    return this.dataSource
      .createQueryBuilder(Blackout, 'blackout')
      .where('blackout.resourceId IN (:...resourceIds)', { resourceIds })
      .andWhere('blackout.period && CAST(:range AS tstzrange)', { range: toRangeLiteral(range) })
      .getMany();
  }
}
