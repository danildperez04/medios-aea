import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { entities } from '#database/entities.js';
import { migrations } from '#database/migrations/index.js';

/**
 * Base compartida de las pruebas de integracion.
 *
 * Levanta la aplicacion completa contra un PostgreSQL real y aplica las
 * migraciones una sola vez. Se usa una base desechable: las pruebas modifican
 * datos, y jamas deben apuntar a desarrollo o produccion.
 */
export interface E2eContext {
  app: INestApplication;
  dataSource: DataSource;
  moduleRef: TestingModule;
}

export const E2E_DATABASE = process.env.DATABASE_NAME ?? 'medios_aea_test';

/**
 * Identificador unico por ejecucion, para que los datos de las pruebas no choquen
 * entre si. Se acota a `max` caracteres (por defecto 20) para caber en codigos y placas.
 */
export function unique(prefix: string, max = 20): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}${suffix}`.slice(0, max);
}

export async function createE2eContext(): Promise<E2eContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  const dataSource = moduleRef.get(DataSource);
  return { app, dataSource, moduleRef };
}

export async function destroyE2eContext(context: E2eContext): Promise<void> {
  await context.app.close();
  if (context.dataSource.isInitialized) {
    await context.dataSource.destroy();
  }
}

/** Aplica las migraciones desde cero. Se invoca una vez por suite. */
export async function runMigrations(dataSource: DataSource): Promise<void> {
  if (!dataSource.isInitialized) await dataSource.initialize();
  // Las extensiones viven en el esquema public: al recrearlo se pierden y la
  // migracion inicial las vuelve a crear.
  await dataSource.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await dataSource.runMigrations({ transaction: 'all' });
}

export { entities, migrations, request };
