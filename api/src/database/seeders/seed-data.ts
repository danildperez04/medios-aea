import { UserRole } from '#common/enums/domain.enums.js';

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
