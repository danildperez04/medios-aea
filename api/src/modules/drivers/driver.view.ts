import { licenseStatus, type LicenseStatus } from '#common/utils/calendar.js';
import type { Driver } from './entities/driver.entity.js';

/** Conductor con los datos de su usuario y el estado de la licencia ya calculado. */
export interface DriverView {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  licenseNumber: string;
  licenseExpiry: string;
  licenseStatus: LicenseStatus;
  isActive: boolean;
  createdAt: Date;
}

export function toDriverView(driver: Driver, now = new Date()): DriverView {
  return {
    id: driver.id,
    userId: driver.userId,
    fullName: driver.user.fullName,
    email: driver.user.email,
    phone: driver.user.phone,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    licenseStatus: licenseStatus(driver.licenseExpiry, now),
    // Un conductor cuyo usuario fue desactivado tampoco puede asignarse.
    isActive: driver.isActive && driver.user.isActive,
    createdAt: driver.createdAt,
  };
}

/**
 * Persona habilitada para conducir, tal como la ve quien solicita (RN-15): sin
 * licencia ni datos de contacto, solo lo necesario para elegirla.
 */
export interface DriverOption {
  id: string;
  userId: string;
  fullName: string;
  licenseExpiry: string;
}

export function toDriverOption(driver: Driver): DriverOption {
  return {
    id: driver.id,
    userId: driver.userId,
    fullName: driver.user.fullName,
    licenseExpiry: driver.licenseExpiry,
  };
}
