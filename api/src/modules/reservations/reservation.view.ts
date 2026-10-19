import type { RequestStatus, ResourceType } from '#common/enums/domain.enums.js';
import type { ReservationRequest } from './entities/reservation-request.entity.js';

/** Una solicitud tal como la devuelve la API. */
export interface ReservationView {
  id: string;
  code: string;
  status: RequestStatus;
  purpose: string;
  destination: string;
  passengers: number;
  startsAt: Date;
  endsAt: Date;
  resourceType: ResourceType;
  project: { id: string; code: string; name: string };
  requester: { id: string; fullName: string };
  /** Medio que pidió quien solicita; null si le da igual. */
  preferredResource: { id: string; name: string; identifier: string } | null;
  /** Quién propone quien solicita que conduzca (RN-15). */
  proposedDriver: { id: string; fullName: string } | null;
  rejectionReason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}

/**
 * Requiere las relaciones project, requester, preferredResource (+ vehicle) y
 * proposedDriver (+ user) cargadas.
 */
export function toReservationView(request: ReservationRequest): ReservationView {
  const preferred = request.preferredResource;
  return {
    id: request.id,
    code: request.code,
    status: request.status,
    purpose: request.purpose,
    destination: request.destination,
    passengers: request.passengers,
    startsAt: request.startsAt,
    endsAt: request.endsAt,
    resourceType: request.resourceType,
    project: { id: request.project.id, code: request.project.code, name: request.project.name },
    requester: { id: request.requester.id, fullName: request.requester.fullName },
    preferredResource: preferred
      ? {
          id: preferred.id,
          name: preferred.name,
          identifier: preferred.vehicle?.plate ?? preferred.name,
        }
      : null,
    proposedDriver: request.proposedDriver
      ? { id: request.proposedDriver.id, fullName: request.proposedDriver.user.fullName }
      : null,
    rejectionReason: request.rejectionReason,
    decidedAt: request.decidedAt,
    createdAt: request.createdAt,
  };
}
