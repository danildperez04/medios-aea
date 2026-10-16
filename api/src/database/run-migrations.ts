import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import dataSource from './data-source.js';

/**
 * Aplica las migraciones pendientes y arranca la API.
 *
 * Lo invoca el `command` del contenedor en docker-compose.prod.yml: sin este
 * paso, un despliegue a una versión con migraciones nuevas serviría un código
 * que espera columnas que la base todavía no tiene.
 */
async function main(): Promise<void> {
  const logger = new Logger('Migrations');
  logger.log('Aplicando migraciones pendientes...');
  await dataSource.initialize();
  const applied = await dataSource.runMigrations({ transaction: 'all' });
  if (applied.length === 0) {
    logger.log('No hay migraciones pendientes.');
  } else {
    for (const migration of applied) {
      logger.log(`Aplicada: ${migration.name}`);
    }
  }
  await dataSource.destroy();
}

main().catch((error: unknown) => {
  console.error('Error al aplicar migraciones:', error);
  process.exit(1);
});
