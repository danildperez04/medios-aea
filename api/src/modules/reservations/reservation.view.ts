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
  /** Lo que la coordinación asignó al aprobar (HU-11); null si no está aprobada. */
  assignment: {
    id: string;
    resource: { id: string; name: string; identifier: string };
    driver: { id: string; fullName: string } | null;
  } | null;
  rejectionReason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}

/**
 * Requiere las relaciones project, requester, preferredResource (+ vehicle),
 * proposedDriver (+ user) y las asignaciones activas (+ resource, vehicle, driver,
 * user) cargadas.
 */
export function toReservationView(request: ReservationRequest): ReservationView {
  const preferred = request.preferredResource;
  // Nunca hay más de una activa: la reasignación desactiva la anterior (RN-10).
  const assignment = request.assignments?.find((a) => a.active);
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
    assignment: assignment
      ? {
          id: assignment.id,
          resource: {
            id: assignment.resource.id,
            name: assignment.resource.name,
            identifier: assignment.resource.vehicle?.plate ?? assignment.resource.name,
          },
          driver: assignment.driver
            ? { id: assignment.driver.id, fullName: assignment.driver.user.fullName }
            : null,
        }
      : null,
    rejectionReason: request.rejectionReason,
    decidedAt: request.decidedAt,
    createdAt: request.createdAt,
  };
}
