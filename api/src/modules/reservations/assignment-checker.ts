import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ResourceStatus, ResourceType } from '#common/enums/domain.enums.js';
import { toRangeLiteral, type TimeRange } from '#common/utils/time-range.js';
import {
  driverUnavailableReasons,
  resourceUnavailableReasons,
} from '#modules/availability/availability.rules.js';
import { Blackout } from '#modules/blackouts/entities/blackout.entity.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { Vehicle } from '#modules/resources/entities/vehicle.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import { driverProblem, resourceProblem, type ApprovalProblem } from './approval.rules.js';
import { ReservationAssignment } from './entities/reservation-assignment.entity.js';
import type { ReservationRequest } from './entities/reservation-request.entity.js';

/** Medio y conductor que sirven para una solicitud, ya bloqueados. */
export interface Assignable {
  resource: Resource;
  driver: Driver | null;
}

/**
 * Valida que un medio y un conductor sirvan para una solicitud (RN-01 a RN-05, RN-09).
 * Lo usan aprobar, reservar desde el panel y reasignar.
 *
 * Orden de candados: la solicitud (la bloquea quien llama), después el medio y por último
 * el conductor. No cambiarlo: es lo que evita un deadlock entre dos aprobaciones.
 */
@Injectable()
export class AssignmentChecker {
  /**
   * Bloquea la fila del medio con FOR UPDATE, el mismo candado que los bloqueos, y luego
   * la del conductor. `exceptAssignmentId` es la asignación que se está reemplazando al
   * reasignar: la del propio viaje no cuenta como choque.
   */
  async check(
    manager: EntityManager,
    request: ReservationRequest,
    resourceId: string,
    driverId: string | null,
    exceptAssignmentId?: string,
  ): Promise<Assignable> {
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
      { resourceId: resource.id },
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
        { driverId: driver.id },
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
}

function throwProblem(problem: ApprovalProblem | null): void {
  if (problem) throw new HttpException(problem.message, problem.status);
}
