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

/**
 * Licencias de ejemplo (por correo). Ana es técnica y maneja ella misma, como casi
 * todo el personal de la fundación (ADR 0004); Carlos no tiene licencia.
 */
export const SEED_DRIVERS = [
  {
    email: 'ana.martinez@demo.medios-aea.org',
    licenseNumber: 'B-3344556',
    licenseExpiry: '2029-06-30',
  },
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

/** Estado final de una solicitud de ejemplo y, si se decidió, cómo. */
export type SeedRequestOutcome =
  | { status: 'PENDING' }
  | { status: 'APPROVED'; plate: string; driverEmail: string }
  | { status: 'REJECTED'; reason: string }
  | { status: 'CANCELLED' };

/**
 * Solicitudes de ejemplo para ver la bandeja, la agenda y el historial con datos.
 * Las fechas son relativas al día en que corre el seeder (`day`: 1 = mañana), así
 * nunca caen en el pasado. Mañana la Frontier está en taller (bloqueo de ejemplo):
 * con las dos aprobadas, la agenda muestra los tres medios ocupados.
 */
export const SEED_REQUESTS: {
  requesterEmail: string;
  projectCode: string;
  destination: string;
  purpose: string;
  passengers: number;
  day: number;
  startHour: number;
  hours: number;
  proposedDriverEmail: string;
  preferredPlate?: string;
  outcome: SeedRequestOutcome;
}[] = [
  {
    requesterEmail: 'ana.martinez@demo.medios-aea.org',
    projectCode: 'PRY-AGUA',
    destination: 'Comunidad Las Sabanas, Madriz',
    purpose: 'Taller de higiene con promotoras de salud',
    passengers: 3,
    day: 1,
    startHour: 8,
    hours: 6,
    proposedDriverEmail: 'ana.martinez@demo.medios-aea.org',
    outcome: {
      status: 'APPROVED',
      plate: 'M 789-012',
      driverEmail: 'ana.martinez@demo.medios-aea.org',
    },
  },
  {
    requesterEmail: 'carlos.rivera@demo.medios-aea.org',
    projectCode: 'PRY-EDU',
    destination: 'Instituto de Palacagüina',
    purpose: 'Reunión con el equipo docente',
    passengers: 2,
    day: 1,
    startHour: 13,
    hours: 4,
    proposedDriverEmail: 'jose.gutierrez@demo.medios-aea.org',
    outcome: {
      status: 'APPROVED',
      plate: 'M 123-456',
      driverEmail: 'jose.gutierrez@demo.medios-aea.org',
    },
  },
  {
    requesterEmail: 'carlos.rivera@demo.medios-aea.org',
    projectCode: 'PRY-EDU',
    destination: 'Escuela Rubén Darío, Somoto',
    purpose: 'Entrega de materiales escolares',
    passengers: 2,
    day: 2,
    startHour: 8,
    hours: 4,
    proposedDriverEmail: 'jose.gutierrez@demo.medios-aea.org',
    preferredPlate: 'M 123-456',
    outcome: { status: 'PENDING' },
  },
  {
    requesterEmail: 'ana.martinez@demo.medios-aea.org',
    projectCode: 'PRY-AGUA',
    destination: 'Comunidad El Rosario, Totogalpa',
    purpose: 'Mantenimiento de filtros de agua',
    passengers: 3,
    day: 3,
    startHour: 7,
    hours: 6,
    proposedDriverEmail: 'ana.martinez@demo.medios-aea.org',
    outcome: { status: 'PENDING' },
  },
  {
    requesterEmail: 'carlos.rivera@demo.medios-aea.org',
    projectCode: 'PRY-SAN',
    destination: 'Mercado de Ocotal',
    purpose: 'Compra de semillas para huertos familiares',
    passengers: 1,
    day: 3,
    startHour: 9,
    hours: 2,
    proposedDriverEmail: 'jose.gutierrez@demo.medios-aea.org',
    outcome: { status: 'PENDING' },
  },
  {
    requesterEmail: 'carlos.rivera@demo.medios-aea.org',
    projectCode: 'PRY-SAN',
    destination: 'Finca El Naranjo, San Lucas',
    purpose: 'Visita de seguimiento a productores',
    passengers: 2,
    day: 4,
    startHour: 8,
    hours: 5,
    proposedDriverEmail: 'jose.gutierrez@demo.medios-aea.org',
    outcome: {
      status: 'REJECTED',
      reason:
        'Ese día los tres medios están comprometidos con la feria departamental. Propón otra fecha.',
    },
  },
  {
    requesterEmail: 'ana.martinez@demo.medios-aea.org',
    projectCode: 'PRY-EDU',
    destination: 'Escuela de Mozonte',
    purpose: 'Feria de lectura',
    passengers: 2,
    day: 5,
    startHour: 8,
    hours: 4,
    proposedDriverEmail: 'ana.martinez@demo.medios-aea.org',
    outcome: { status: 'CANCELLED' },
  },
];
