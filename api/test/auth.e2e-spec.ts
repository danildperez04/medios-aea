import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';
import { createUser, PASSWORD } from './fixtures.js';

/**
 * Pruebas de integracion de salud y autenticacion (RF-01, RNF-06).
 *
 * Requieren la base `medios_aea_test`:
 *   pnpm db:up
 *   pnpm test:e2e
 */
describe('Autenticacion (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let requester: User;
  let token: string;

  const basePath = '/api/v1';

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);

    requester = await createUser(dataSource, UserRole.REQUESTER);
    const login = await request(app.getHttpServer())
      .post(`${basePath}/auth/login`)
      .send({ email: requester.email, password: PASSWORD })
      .expect(200);
    token = login.body.accessToken as string;
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  describe('endpoint de salud', () => {
    it('responde sin autenticacion y con la base conectada', async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/health`).expect(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
    });
  });

  describe('RF-01 — inicio de sesion', () => {
    it('devuelve token y perfil con credenciales correctas', async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/auth/login`)
        .send({ email: requester.email, password: PASSWORD })
        .expect(200);

      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.user.email).toBe(requester.email);
      expect(response.body.user.role).toBe(UserRole.REQUESTER);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('no distingue mayusculas en el correo', async () => {
      await request(app.getHttpServer())
        .post(`${basePath}/auth/login`)
        .send({ email: requester.email.toUpperCase(), password: PASSWORD })
        .expect(200);
    });

    it('rechaza una contraseña incorrecta con 401', async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/auth/login`)
        .send({ email: requester.email, password: 'Incorrecta123' })
        .expect(401);
      expect(response.body.message).toBe('Correo o contraseña incorrectos.');
    });

    it('rechaza un correo inexistente con el mismo mensaje', async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/auth/login`)
        .send({ email: 'nadie@aea.test', password: PASSWORD })
        .expect(401);
      expect(response.body.message).toBe('Correo o contraseña incorrectos.');
    });

    it('rechaza una cuenta desactivada con 403', async () => {
      const inactive = await createUser(dataSource, UserRole.REQUESTER, { isActive: false });
      await request(app.getHttpServer())
        .post(`${basePath}/auth/login`)
        .send({ email: inactive.email, password: PASSWORD })
        .expect(403);
    });

    it('rechaza un correo mal formado con 400', async () => {
      await request(app.getHttpServer())
        .post(`${basePath}/auth/login`)
        .send({ email: 'no-es-correo', password: PASSWORD })
        .expect(400);
    });
  });

  describe('sesion', () => {
    it('devuelve el perfil con un token valido', async () => {
      const response = await request(app.getHttpServer())
        .get(`${basePath}/auth/me`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.id).toBe(requester.id);
    });

    it('rechaza sin token o con firma manipulada', async () => {
      await request(app.getHttpServer()).get(`${basePath}/auth/me`).expect(401);
      const [header, payload] = token.split('.');
      await request(app.getHttpServer())
        .get(`${basePath}/auth/me`)
        .set('Authorization', `Bearer ${header}.${payload}.firma-falsa`)
        .expect(401);
    });
  });
});
