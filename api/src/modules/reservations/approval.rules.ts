import { HttpStatus } from '@nestjs/common';
import type {
  DriverUnavailableReason,
  ResourceUnavailableReason,
} from '#modules/availability/availability.rules.js';

/** Por qué no se puede aprobar con ese medio o ese conductor, y con qué código responder. */
export interface ApprovalProblem {
  status: HttpStatus.CONFLICT | HttpStatus.UNPROCESSABLE_ENTITY;
  message: string;
}

/**
 * Traduce los motivos de `resourceUnavailableReasons` a la respuesta de la
 * aprobación (RN-01, RN-04, RN-05). Un choque de horario es 409; un medio que no
 * sirve para esta solicitud (mantenimiento, capacidad) es 422. Devuelve el primero.
 */
export function resourceProblem(
  reasons: ResourceUnavailableReason[],
  resource: { name: string; passengerCapacity: number | null },
  passengers: number,
  conflictLabel?: string,
): ApprovalProblem | null {
  const [reason] = reasons;
  switch (reason) {
    case undefined:
      return null;
    case 'MAINTENANCE':
      return unprocessable(`${resource.name} está en mantenimiento. Elige otro medio.`);
    case 'CAPACITY':
      return unprocessable(
        `${resource.name} lleva ${resource.passengerCapacity} pasajeros y la solicitud es para ${passengers}. Elige un medio más grande.`,
      );
    case 'BLOCKED':
      return conflict(`${resource.name} tiene un bloqueo en ese horario. Elige otro medio.`);
    case 'BUSY':
      return conflict(
        `${resource.name} ya tiene un viaje aprobado en ese horario${conflictLabel ? ` (${conflictLabel})` : ''}. Elige otro medio o reasigna ese viaje.`,
      );
  }
}

/** Igual que `resourceProblem`, para el conductor (RN-02, RN-09). */
export function driverProblem(
  reasons: DriverUnavailableReason[],
  driver: { fullName: string; licenseExpiry: string },
  conflictLabel?: string,
): ApprovalProblem | null {
  const [reason] = reasons;
  switch (reason) {
    case undefined:
      return null;
    case 'INACTIVE':
      return unprocessable(
        `${driver.fullName} no está habilitado para conducir. Elige a otra persona.`,
      );
    case 'LICENSE_EXPIRED': {
      const [year, month, day] = driver.licenseExpiry.split('-');
      return unprocessable(
        `La licencia de ${driver.fullName} vence el ${day}/${month}/${year} y no cubre el viaje. Elige a otra persona.`,
      );
    }
    case 'BUSY':
      return conflict(
        `${driver.fullName} ya conduce otro viaje en ese horario${conflictLabel ? ` (${conflictLabel})` : ''}. Elige a otra persona.`,
      );
  }
}

function conflict(message: string): ApprovalProblem {
  return { status: HttpStatus.CONFLICT, message };
}

function unprocessable(message: string): ApprovalProblem {
  return { status: HttpStatus.UNPROCESSABLE_ENTITY, message };
}
