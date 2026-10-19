import { MAX_RANGE_DAYS } from '#common/dto/time-range-query.dto.js';
import { RequestStatus } from '#common/enums/domain.enums.js';
import { licenseCovers } from '#common/utils/calendar.js';

/** Margen para relojes desfasados: una solicitud "para ahora" no se rechaza por segundos. */
export const PAST_TOLERANCE_MS = 5 * 60_000;

/**
 * Valida el horario de una solicitud (RN-06). Devuelve el mensaje de error, o
 * null si es válido. Función pura para probarla sin base de datos.
 */
export function requestWindowError(start: Date, end: Date, now: Date = new Date()): string | null {
  if (!(end > start)) return 'La hora de fin debe ser posterior a la de inicio.';
  if (start.getTime() < now.getTime() - PAST_TOLERANCE_MS) {
    return 'La solicitud no puede empezar en el pasado.';
  }
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
    return `Una solicitud no puede durar más de ${MAX_RANGE_DAYS} días.`;
  }
  return null;
}

/** `SOL-2026-00042`: año de la solicitud y correlativo global. */
export function formatRequestCode(year: number, sequence: number): string {
  return `SOL-${year}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Valida que una solicitud se pueda cancelar (RF-11, RN-13). Devuelve el mensaje
 * de error, o null si se puede. Solo pendientes y aprobadas cuyo viaje no inició.
 */
export function cancellationError(status: RequestStatus, tripStarted: boolean): string | null {
  switch (status) {
    case RequestStatus.PENDING:
      return null;
    case RequestStatus.APPROVED:
      return tripStarted
        ? 'El viaje ya inició; no se puede cancelar. Pide al conductor que registre la llegada.'
        : null;
    case RequestStatus.CANCELLED:
      return 'La solicitud ya estaba cancelada.';
    case RequestStatus.REJECTED:
      return 'La solicitud fue rechazada; no hay nada que cancelar.';
    case RequestStatus.COMPLETED:
      return 'El viaje ya terminó; no se puede cancelar.';
  }
}

/** Lo que hace falta de un conductor para proponerlo (RN-15). */
export interface ProposedDriverCandidate {
  isActive: boolean;
  licenseExpiry: string;
  user: { fullName: string; isActive: boolean };
}

/**
 * Valida al conductor propuesto para un viaje que termina en `end` (RN-15, RN-09).
 * Devuelve el mensaje de error, o null si puede conducir.
 */
export function proposedDriverError(
  driver: ProposedDriverCandidate | null,
  end: Date,
): string | null {
  if (!driver || !driver.isActive || !driver.user.isActive) {
    return 'La persona que conduce no está habilitada. Elige a alguien con licencia registrada.';
  }
  if (!licenseCovers(driver.licenseExpiry, end)) {
    const [year, month, day] = driver.licenseExpiry.split('-');
    return `La licencia de ${driver.user.fullName} vence el ${day}/${month}/${year} y no cubre el viaje. Elige a otra persona.`;
  }
  return null;
}
