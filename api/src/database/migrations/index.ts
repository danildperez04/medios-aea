import { AddProposedDriver1792411200000 } from './1792411200000-AddProposedDriver.js';
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
export const migrations = [InitialSchema1792108800000, AddProposedDriver1792411200000];

export { AddProposedDriver1792411200000, InitialSchema1792108800000 };
