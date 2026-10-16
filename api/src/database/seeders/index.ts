import { Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import type { DataSource } from 'typeorm';
import { Project } from '#modules/projects/entities/project.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import { SEED_PASSWORD, SEED_PROJECTS, SEED_USERS } from './seed-data.js';

const logger = new Logger('Seeder');

/**
 * Carga los datos de ejemplo. Es IDEMPOTENTE: cada fila se busca primero por su
 * clave natural (correo, código), así que se puede ejecutar varias veces.
 * Cada sprint agrega aquí sus datos (vehículos y conductores en el Sprint 2).
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
