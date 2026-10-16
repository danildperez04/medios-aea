import { AuditLog } from '#modules/audit/entities/audit-log.entity.js';
import { Blackout } from '#modules/blackouts/entities/blackout.entity.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Notification } from '#modules/notifications/entities/notification.entity.js';
import { UserDevice } from '#modules/notifications/entities/user-device.entity.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';
import { ReservationRequest } from '#modules/reservations/entities/reservation-request.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { Vehicle } from '#modules/resources/entities/vehicle.entity.js';
import { TripLog } from '#modules/trips/entities/trip-log.entity.js';
import { User } from '#modules/users/entities/user.entity.js';

/**
 * Las 12 entidades de Medios AeA.
 * Ver docs/10-esquema-base-de-datos.md §3.
 */
export const entities = [
  User,
  Project,
  Resource,
  Vehicle,
  Driver,
  Blackout,
  ReservationRequest,
  ReservationAssignment,
  TripLog,
  Notification,
  UserDevice,
  AuditLog,
];

export {
  User,
  Project,
  Resource,
  Vehicle,
  Driver,
  Blackout,
  ReservationRequest,
  ReservationAssignment,
  TripLog,
  Notification,
  UserDevice,
  AuditLog,
};
