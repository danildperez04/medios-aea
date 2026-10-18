import { FuelType, UserRole } from '#common/enums/domain.enums.js';

/**
 * Datos de ejemplo para desarrollo y demostraciones.
 *
 * Son ficticios: no corresponden a personal real de la fundación. La contraseña
 * es común y pública a propósito, por eso el seeder se niega a correr en
 * producción (ver index.ts).
 */
export const SEED_PASSWORD = 'MediosAea2026';

export const SEED_USERS = [
  {
    fullName: 'Coordinación Logística (demo)',
    email: 'admin@demo.medios-aea.org',
    role: UserRole.ADMIN,
  },
  { fullName: 'Ana Martínez', email: 'ana.martinez@demo.medios-aea.org', role: UserRole.REQUESTER },
  {
    fullName: 'Carlos Rivera',
    email: 'carlos.rivera@demo.medios-aea.org',
    role: UserRole.REQUESTER,
  },
  {
    fullName: 'José Gutiérrez',
    email: 'jose.gutierrez@demo.medios-aea.org',
    role: UserRole.DRIVER,
  },
  { fullName: 'Luis Herrera', email: 'luis.herrera@demo.medios-aea.org', role: UserRole.DRIVER },
] as const;

export const SEED_PROJECTS = [
  { code: 'PRY-AGUA', name: 'Agua segura en comunidades rurales' },
  { code: 'PRY-EDU', name: 'Educación y refuerzo escolar' },
  { code: 'PRY-SAN', name: 'Seguridad alimentaria y nutrición' },
] as const;

export const SEED_VEHICLES = [
  {
    name: 'Hilux blanca',
    plate: 'M 123-456',
    brand: 'Toyota',
    model: 'Hilux',
    year: 2022,
    passengerCapacity: 4,
    fuelType: FuelType.DIESEL,
    currentOdometer: 45_200,
  },
  {
    name: 'Prado gris',
    plate: 'M 789-012',
    brand: 'Toyota',
    model: 'Land Cruiser Prado',
    year: 2019,
    passengerCapacity: 6,
    fuelType: FuelType.DIESEL,
    currentOdometer: 112_640,
  },
  {
    name: 'Frontier azul',
    plate: 'M 345-678',
    brand: 'Nissan',
    model: 'Frontier',
    year: 2020,
    passengerCapacity: 4,
    fuelType: FuelType.DIESEL,
    currentOdometer: 87_310,
  },
] as const;

/** Licencias de los conductores de ejemplo (por correo). */
export const SEED_DRIVERS = [
  {
    email: 'jose.gutierrez@demo.medios-aea.org',
    licenseNumber: 'B-1029384',
    licenseExpiry: '2028-03-31',
  },
  {
    email: 'luis.herrera@demo.medios-aea.org',
    licenseNumber: 'B-5647382',
    licenseExpiry: '2026-11-10',
  },
] as const;
