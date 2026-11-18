import type { RequestStatus } from '#common/enums/domain.enums.js';
import type { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';

/**
 * En qué va un viaje, desde el punto de vista de quien conduce:
 * - `UPCOMING`: aprobado y sin salida registrada;
 * - `IN_PROGRESS`: con salida registrada y sin llegada;
 * - `FINISHED`: con llegada registrada (HU-21).
 */
export type TripState = 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED';

/** Un viaje de "Mis viajes" (RF-21, HU-20). Se identifica por su solicitud. */
export interface TripView {
  reservationId: string;
  code: string;
  requestStatus: RequestStatus;
  state: TripState;
  purpose: string;
  destination: string;
  passengers: number;
  startsAt: Date;
  endsAt: Date;
  project: { code: string; name: string };
  /** Quién pidió el viaje, con su teléfono para coordinar la salida. */
  requester: { fullName: string; phone: string | null };
  vehicle: { name: string; identifier: string; passengerCapacity: number | null };
  /** Salida y llegada registradas (HU-21); null mientras no sale. */
  log: { startedAt: Date; finishedAt: Date | null } | null;
}

/**
 * Requiere la solicitud (+ proyecto y solicitante), el medio (+ vehículo) y la
 * bitácora cargados.
 */
export function toTripView(assignment: ReservationAssignment): TripView {
  const { request, resource } = assignment;
  const trip = assignment.trip ?? null;
  return {
    reservationId: request.id,
    code: request.code,
    requestStatus: request.status,
    state: !trip ? 'UPCOMING' : trip.finishedAt ? 'FINISHED' : 'IN_PROGRESS',
    purpose: request.purpose,
    destination: request.destination,
    passengers: request.passengers,
    startsAt: request.startsAt,
    endsAt: request.endsAt,
    project: { code: request.project.code, name: request.project.name },
    requester: { fullName: request.requester.fullName, phone: request.requester.phone },
    vehicle: {
      name: resource.name,
      identifier: resource.vehicle?.plate ?? resource.name,
      passengerCapacity: resource.vehicle?.passengerCapacity ?? null,
    },
    log: trip ? { startedAt: trip.startedAt, finishedAt: trip.finishedAt } : null,
  };
}
