import { ResourceStatus } from '#common/enums/domain.enums.js';
import { licenseCovers } from '#common/utils/calendar.js';
import type { TimeRange } from '#common/utils/time-range.js';

/**
 * Por qué un medio no se puede asignar en un periodo (RN-01, RN-04, RN-05).
 * - MAINTENANCE: el medio está marcado en mantenimiento.
 * - CAPACITY: no caben los pasajeros pedidos (solo vehículos).
 * - BLOCKED: tiene un bloqueo que se cruza con el periodo.
 * - BUSY: tiene una asignación activa que se cruza con el periodo.
 */
export type ResourceUnavailableReason = 'MAINTENANCE' | 'CAPACITY' | 'BLOCKED' | 'BUSY';

export interface ResourceFacts {
  status: ResourceStatus;
  /** null para medios sin capacidad de pasajeros (equipos). */
  passengerCapacity: number | null;
  hasBlackout: boolean;
  hasAssignment: boolean;
}

export function resourceUnavailableReasons(
  facts: ResourceFacts,
  passengers?: number,
): ResourceUnavailableReason[] {
  const reasons: ResourceUnavailableReason[] = [];
  if (facts.status === ResourceStatus.MAINTENANCE) reasons.push('MAINTENANCE');
  if (
    passengers !== undefined &&
    facts.passengerCapacity !== null &&
    facts.passengerCapacity < passengers
  ) {
    reasons.push('CAPACITY');
  }
  if (facts.hasBlackout) reasons.push('BLOCKED');
  if (facts.hasAssignment) reasons.push('BUSY');
  return reasons;
}

/** Por qué un conductor no se puede asignar (RN-02, RN-09). */
export type DriverUnavailableReason = 'INACTIVE' | 'LICENSE_EXPIRED' | 'BUSY';

export interface DriverFacts {
  isActive: boolean;
  licenseExpiry: string;
  hasAssignment: boolean;
}

export function driverUnavailableReasons(
  facts: DriverFacts,
  range: TimeRange,
): DriverUnavailableReason[] {
  const reasons: DriverUnavailableReason[] = [];
  if (!facts.isActive) reasons.push('INACTIVE');
  if (!licenseCovers(facts.licenseExpiry, range.end)) reasons.push('LICENSE_EXPIRED');
  if (facts.hasAssignment) reasons.push('BUSY');
  return reasons;
}
