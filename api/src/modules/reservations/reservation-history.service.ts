import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { AuditLog } from '#modules/audit/entities/audit-log.entity.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { ReservationRequest } from './entities/reservation-request.entity.js';
import {
  describeHistoryEntry,
  referencedIds,
  type ReservationHistoryEntry,
} from './history.rules.js';

/** Nombre con que `audit_log.entity` identifica a las solicitudes. */
export const RESERVATION_AUDIT_ENTITY = 'reservation_request';

/**
 * Historial de decisiones de una solicitud (RF-17, HU-15): quién aprobó, rechazó,
 * canceló o reasignó, y cuándo. Solo lectura sobre `audit_log`, que las operaciones de
 * `ReservationsService` escriben en su misma transacción.
 */
@Injectable()
export class ReservationHistoryService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findFor(requestId: string): Promise<ReservationHistoryEntry[]> {
    if (!(await this.dataSource.getRepository(ReservationRequest).existsBy({ id: requestId }))) {
      throw new NotFoundException('La solicitud no existe.');
    }
    const logs = await this.dataSource.getRepository(AuditLog).find({
      where: { entity: RESERVATION_AUDIT_ENTITY, entityId: requestId },
      relations: { actor: true },
      order: { createdAt: 'ASC' },
    });

    // La auditoría guarda ids: los nombres se buscan una sola vez para todas las entradas.
    const cited = logs.map((log) => referencedIds(log.payload));
    const resourceIds = [...new Set(cited.flatMap((ids) => ids.resources))];
    const driverIds = [...new Set(cited.flatMap((ids) => ids.drivers))];
    const [resources, drivers] = await Promise.all([
      resourceIds.length
        ? this.dataSource
            .getRepository(Resource)
            .find({ where: { id: In(resourceIds) }, relations: { vehicle: true } })
        : [],
      driverIds.length
        ? this.dataSource
            .getRepository(Driver)
            .find({ where: { id: In(driverIds) }, relations: { user: true } })
        : [],
    ]);
    const names = {
      resources: new Map(
        resources.map((resource) => [
          resource.id,
          resource.vehicle ? `${resource.name} (${resource.vehicle.plate})` : resource.name,
        ]),
      ),
      drivers: new Map(drivers.map((driver) => [driver.id, driver.user.fullName])),
    };

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      actor: log.actor ? { id: log.actor.id, fullName: log.actor.fullName } : null,
      at: log.createdAt,
      detail: describeHistoryEntry(log.action, log.payload, names),
    }));
  }
}
