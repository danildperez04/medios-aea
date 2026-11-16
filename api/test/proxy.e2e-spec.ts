import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import request from 'supertest';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';

// Antes de los import: AppModule lee y valida el entorno al cargarse.
const previousHops = vi.hoisted(() => {
  const previous = process.env.TRUST_PROXY_HOPS;
  process.env.TRUST_PROXY_HOPS = '1';
  return previous;
});

/**
 * Detrás de un proxy (nginx en producción) el límite de intentos de inicio de sesión
 * cuenta por la dirección de quien hace la petición, no por la del proxy (RNF-01).
 */
describe('Límite de peticiones detrás de un proxy (integración)', () => {
  const login = '/api/v1/auth/login';
  const credentials = { email: 'nadie@aea.test', password: 'ClaveIncorrecta1' };
  const LOGIN_LIMIT = 10;

  let app: INestApplication;
  let dataSource: DataSource;

  const attempt = (forwardedFor: string): Promise<number> =>
    request(app.getHttpServer())
      .post(login)
      .set('X-Forwarded-For', forwardedFor)
      .send(credentials)
      .then((response) => response.status);

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
  }, 60_000);

  afterAll(async () => {
    if (previousHops === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = previousHops;
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  it('cada dirección tiene su propio límite de intentos', async () => {
    for (let i = 0; i < LOGIN_LIMIT; i += 1) {
      expect(await attempt('203.0.113.10')).toBe(401);
    }
    expect(await attempt('203.0.113.10')).toBe(429);
    // Otra persona, por el mismo proxy, sigue pudiendo intentar.
    expect(await attempt('203.0.113.20')).toBe(401);
  });

  it('solo cuenta la dirección que agregó el proxy, no lo que escriba el cliente', async () => {
    // nginx agrega la dirección real al final; lo anterior lo pudo inventar el cliente.
    for (let i = 0; i < LOGIN_LIMIT; i += 1) {
      expect(await attempt(`198.51.100.${i}, 203.0.113.30`)).toBe(401);
    }
    expect(await attempt('198.51.100.99, 203.0.113.30')).toBe(429);
  });
});
