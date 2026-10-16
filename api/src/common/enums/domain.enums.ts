/**
 * Enums del dominio Medios AeA.
 * Cada enum corresponde a un tipo ENUM de PostgreSQL.
 * Ver docs/10-esquema-base-de-datos.md §2.
 */

/**
 * Rol del usuario.
 * - ADMIN: coordinación logística; accede a todo.
 * - REQUESTER: técnico de proyecto; solicita vehículos.
 * - DRIVER: conductor; registra los viajes que tiene asignados.
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  REQUESTER = 'REQUESTER',
  DRIVER = 'DRIVER',
}

/**
 * Tipo de recurso (medio). En el MVP solo existen vehículos; en la fase 2 se
 * agrega EQUIPMENT (proyectores, laptops, sonido) sin tocar la regla anti-choque.
 */
export enum ResourceType {
  VEHICLE = 'VEHICLE',
}

/** Estado operativo de un recurso. Solo un recurso AVAILABLE se puede asignar (RN-04). */
export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

export enum FuelType {
  GASOLINE = 'GASOLINE',
  DIESEL = 'DIESEL',
}

/** Ciclo de vida de una solicitud. Ver docs/02-prd-mvp-moscow.md §3. */
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/** Motivo de un bloqueo de recurso. */
export enum BlackoutReason {
  MAINTENANCE = 'MAINTENANCE',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  OTHER = 'OTHER',
}

/** Acciones que quedan en el registro de auditoría (RF-17). */
export enum AuditAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
  REASSIGN = 'REASSIGN',
  COMPLETE = 'COMPLETE',
}
