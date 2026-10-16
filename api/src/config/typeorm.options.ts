import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { entities } from '#database/entities.js';
import { migrations } from '#database/migrations/index.js';

/**
 * Opciones de TypeORM derivadas de la configuración validada.
 *
 * `synchronize` es false salvo que el entorno lo habilite explícitamente.
 * El esquema se cambia únicamente por migración: sincronizar en producción
 * puede borrar columnas sin avisar.
 */
function connectionFrom(config: ConfigService): Record<string, unknown> {
  const url = config.get<string>('DATABASE_URL');
  if (url) return { url };
  return {
    host: config.get<string>('DATABASE_HOST', 'localhost'),
    port: config.get<number>('DATABASE_PORT', 5432),
    username: config.get<string>('DATABASE_USER'),
    password: config.get<string>('DATABASE_PASSWORD'),
    database: config.get<string>('DATABASE_NAME'),
  };
}

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    // Con DATABASE_URL (PaaS) TypeORM toma de ahí host, puerto, usuario y base.
    ...connectionFrom(config),
    entities,
    migrations,
    synchronize: config.get<boolean>('DATABASE_SYNCHRONIZE', false),
    logging: config.get<boolean>('DATABASE_LOGGING', false),
    ssl: config.get<boolean>('DATABASE_SSL', false) ? { rejectUnauthorized: false } : false,
    autoLoadEntities: false,
    retryAttempts: 10,
    retryDelay: 3000,
  };
}
