import { AuditAction, RequestStatus } from '#common/enums/domain.enums.js';

/** Un paso del historial de una solicitud tal como lo devuelve la API (RF-17, HU-15). */
export interface ReservationHistoryEntry {
  id: string;
  action: AuditAction;
  /** Quién lo hizo; null si su cuenta ya no existe. */
  actor: { id: string; fullName: string } | null;
  at: Date;
  /** Qué se decidió, en una frase; null si la acción no necesita explicación. */
  detail: string | null;
}

/** Nombres de los medios y de las personas que conducen citados en la auditoría. */
export interface HistoryNames {
  resources: ReadonlyMap<string, string>;
  drivers: ReadonlyMap<string, string>;
}

type Payload = Record<string, unknown> | null;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/** Ids de medios y conductores que cita una entrada, para buscar sus nombres de una vez. */
export function referencedIds(payload: Payload): { resources: string[]; drivers: string[] } {
  const data = record(payload);
  const from = record(data.from);
  const to = record(data.to);
  const only = (values: unknown[]): string[] => values.map(text).filter((id) => id !== null);
  return {
    resources: only([data.resourceId, from.resourceId, to.resourceId]),
    drivers: only([data.driverId, data.proposedDriverId, from.driverId, to.driverId]),
  };
}

/**
 * Explica una entrada de `audit_log` en una frase para la coordinación. Función pura:
 * el `payload` es JSON libre escrito por versiones anteriores, así que cada dato que
 * falte se omite en lugar de romper el historial.
 */
export function describeHistoryEntry(
  action: AuditAction,
  payload: Payload,
  names: HistoryNames,
): string | null {
  const data = record(payload);
  const resource = (id: unknown): string =>
    names.resources.get(text(id) ?? '') ?? 'un medio que ya no existe';
  const driver = (id: unknown): string | null =>
    text(id) ? (names.drivers.get(text(id) as string) ?? 'una persona que ya no existe') : null;

  switch (action) {
    case AuditAction.APPROVE: {
      const who = driver(data.driverId);
      const assigned = `${resource(data.resourceId)}${who ? `; conduce ${who}` : ''}.`;
      if (data.direct === true) return `Registró la reserva ya aprobada: ${assigned}`;
      const proposed = data.driverChanged === true ? driver(data.proposedDriverId) : null;
      return `Asignó ${assigned}${proposed ? ` Se había propuesto a ${proposed}.` : ''}`;
    }
    case AuditAction.REJECT: {
      const reason = text(data.reason);
      return reason ? `Motivo: ${reason}` : null;
    }
    case AuditAction.CANCEL:
      return data.fromStatus === RequestStatus.APPROVED
        ? 'Estaba aprobada: el medio y quien conducía quedaron libres.'
        : data.fromStatus === RequestStatus.PENDING
          ? 'Todavía no se había decidido.'
          : null;
    case AuditAction.REASSIGN: {
      const from = record(data.from);
      const to = record(data.to);
      const changes: string[] = [];
      if (from.resourceId !== to.resourceId) {
        changes.push(`Medio: de ${resource(from.resourceId)} a ${resource(to.resourceId)}.`);
      }
      if (from.driverId !== to.driverId) {
        changes.push(
          `Conduce: ${driver(to.driverId) ?? 'nadie'} en lugar de ${driver(from.driverId) ?? 'nadie'}.`,
        );
      }
      return changes.length ? changes.join(' ') : null;
    }
    default:
      return null;
  }
}
