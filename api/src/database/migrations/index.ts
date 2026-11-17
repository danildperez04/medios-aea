import { AddProposedDriver1792411200000 } from './1792411200000-AddProposedDriver.js';
import { AddRefreshToken1792929600000 } from './1792929600000-AddRefreshToken.js';
import { AddRevokeSessionsAuditAction1794657600000 } from './1794657600000-AddRevokeSessionsAuditAction.js';
import { AddSessionClientAndVersion1794571200000 } from './1794571200000-AddSessionClientAndVersion.js';
import { InitialSchema1792108800000 } from './1792108800000-InitialSchema.js';

/**
 * Migraciones de Medios AeA, en orden de aplicación.
 *
 * Reglas:
 * 1. Se nombran <timestamp>-<PascalCase>.ts.
 * 2. Cada una implementa up y down.
 * 3. Una migración ya aplicada en main NO se edita: se agrega otra que corrige.
 * 4. Los datos iniciales van en seeders, no en migraciones.
 */
export const migrations = [
  InitialSchema1792108800000,
  AddProposedDriver1792411200000,
  AddRefreshToken1792929600000,
  AddSessionClientAndVersion1794571200000,
  AddRevokeSessionsAuditAction1794657600000,
];

export {
  AddProposedDriver1792411200000,
  AddRefreshToken1792929600000,
  AddRevokeSessionsAuditAction1794657600000,
  AddSessionClientAndVersion1794571200000,
  InitialSchema1792108800000,
};
