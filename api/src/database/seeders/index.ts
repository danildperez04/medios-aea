import { Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import type { DataSource } from 'typeorm';
import { BlackoutReason, ResourceStatus, ResourceType } from '#common/enums/domain.enums.js';
import { Blackout } from '#modules/blackouts/entities/blackout.entity.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { Vehicle } from '#modules/resources/entities/vehicle.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import {
  SEED_DRIVERS,
  SEED_PASSWORD,
  SEED_PROJECTS,
  SEED_USERS,
  SEED_VEHICLES,
} from './seed-data.js';

const logger = new Logger('Seeder');

/**
 * Carga los datos de ejemplo. Es IDEMPOTENTE: cada fila se busca primero por su
 * clave natural (correo, código), así que se puede ejecutar varias veces.
 * Cada sprint agrega aquí sus datos.
 */
export async function runSeeders(dataSource: DataSource): Promise<void> {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await hash(SEED_PASSWORD, rounds);

  const users = dataSource.getRepository(User);
  let createdUsers = 0;
  for (const seed of SEED_USERS) {
    if (await users.existsBy({ email: seed.email })) continue;
    await users.save(users.create({ ...seed, phone: null, passwordHash, isActive: true }));
    createdUsers += 1;
  }
  logger.log(`${createdUsers} usuarios creados (${SEED_USERS.length} en total)`);

  const projects = dataSource.getRepository(Project);
  let createdProjects = 0;
  for (const seed of SEED_PROJECTS) {
    if (await projects.existsBy({ code: seed.code })) continue;
    await projects.save(projects.create({ ...seed, isActive: true }));
    createdProjects += 1;
  }
  logger.log(`${createdProjects} proyectos creados (${SEED_PROJECTS.length} en total)`);

  // ---------- Vehículos (resource + vehicle en una transacción) ----------
  let createdVehicles = 0;
  for (const seed of SEED_VEHICLES) {
    if (await dataSource.getRepository(Vehicle).existsBy({ plate: seed.plate })) continue;
    await dataSource.transaction(async (manager) => {
      const { name, ...detail } = seed;
      const resource = await manager.save(
        manager.create(Resource, {
          type: ResourceType.VEHICLE,
          name,
          status: ResourceStatus.AVAILABLE,
        }),
      );
      await manager.save(manager.create(Vehicle, { resourceId: resource.id, ...detail }));
    });
    createdVehicles += 1;
  }
  logger.log(`${createdVehicles} vehículos creados (${SEED_VEHICLES.length} en total)`);

  // ---------- Conductores ----------
  const drivers = dataSource.getRepository(Driver);
  let createdDrivers = 0;
  for (const seed of SEED_DRIVERS) {
    const user = await users.findOneBy({ email: seed.email });
    if (!user || (await drivers.existsBy({ userId: user.id }))) continue;
    await drivers.save(
      drivers.create({
        userId: user.id,
        licenseNumber: seed.licenseNumber,
        licenseExpiry: seed.licenseExpiry,
      }),
    );
    createdDrivers += 1;
  }
  logger.log(`${createdDrivers} conductores creados (${SEED_DRIVERS.length} en total)`);

  // ---------- Un bloqueo de ejemplo: la Frontier en taller mañana ----------
  const frontier = await dataSource.getRepository(Vehicle).findOneBy({ plate: 'M 345-678' });
  const blackouts = dataSource.getRepository(Blackout);
  if (frontier && !(await blackouts.existsBy({ resourceId: frontier.resourceId }))) {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const day = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Managua' });
    await blackouts.save(
      blackouts.create({
        resourceId: frontier.resourceId,
        period: {
          start: new Date(`${day}T07:00:00-06:00`),
          end: new Date(`${day}T17:00:00-06:00`),
        },
        reason: BlackoutReason.MAINTENANCE,
        description: 'Cambio de frenos',
      }),
    );
    logger.log('Bloqueo de ejemplo creado para la Frontier azul');
  }
}

/** Punto de entrada para `pnpm seed:run`. */
export async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'El seeder carga usuarios con una contraseña pública y no se ejecuta en producción. ' +
        'Usa user:create-admin para crear el primer administrador.',
    );
  }
  const { default: dataSource } = await import('../data-source.js');
  logger.log('Cargando datos de ejemplo...');
  await dataSource.initialize();
  try {
    await runSeeders(dataSource);
    logger.log(`Listo. Contraseña de todos los usuarios de ejemplo: ${SEED_PASSWORD}`);
  } finally {
    await dataSource.destroy();
  }
}
