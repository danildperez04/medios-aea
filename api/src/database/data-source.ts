import 'reflect-metadata';
// Este archivo corre fuera de Nest (CLI de migraciones, seeders y scripts), asi
// que ConfigModule todavia no ha leido el .env. Se carga aqui para que
// `pnpm migration:run` funcione sin exportar variables a mano.
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildConfig } from '#config/configuration.js';
import { entities } from './entities.js';
import { migrations } from './migrations/index.js';

/**
 * DataSource para la CLI de TypeORM (migraciones, seeders).
 *
 * La aplicación usa @nestjs/typeorm con buildTypeOrmOptions; este archivo
 * existe solo para que `typeorm migration:run` funcione fuera de Nest.
 * Comparte entidades y migraciones con la app para que nunca se desincronicen.
 */
loadEnv({ path: ['.env.local', '.env'] });

const config = buildConfig();

const dataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.user,
  password: config.database.password,
  database: config.database.name,
  entities,
  migrations,
  synchronize: false,
  logging: config.database.logging,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
});

export default dataSource;
