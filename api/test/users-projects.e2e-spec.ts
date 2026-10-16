import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations, unique } from './e2e-context.js';
import { createUser, loginAs } from './fixtures.js';

/** Usuarios y proyectos (RF-02, RF-03, RF-04 — HU-02, HU-03). */
describe('Usuarios y proyectos (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let admin: User;
  let adminToken: string;
  let requesterToken: string;
  const api = '/api/v1';

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
    admin = await createUser(dataSource, UserRole.ADMIN);
    adminToken = await loginAs(app, admin);
    requesterToken = await loginAs(app, await createUser(dataSource, UserRole.REQUESTER));
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });
  const asRequester = () => ({ Authorization: `Bearer ${requesterToken}` });

  describe('HU-02 — usuarios', () => {
    it('el ADMIN crea un usuario y este puede iniciar sesion', async () => {
      const email = `${unique('tec')}@AEA.test`;
      const created = await request(app.getHttpServer())
        .post(`${api}/users`)
        .set(asAdmin())
        .send({ fullName: 'Técnica Nueva', email, role: 'REQUESTER', password: 'Clave12345' })
        .expect(201);

      expect(created.body.email).toBe(email.toLowerCase());
      expect(created.body).not.toHaveProperty('passwordHash');
      await loginAs(app, { email }, 'Clave12345');
    });

    it('rechaza un correo repetido aunque cambien las mayusculas (409)', async () => {
      await request(app.getHttpServer())
        .post(`${api}/users`)
        .set(asAdmin())
        .send({
          fullName: 'Duplicado',
          email: admin.email.toUpperCase(),
          role: 'REQUESTER',
          password: 'Clave12345',
        })
        .expect(409);
    });

    it('rechaza una contraseña debil y un rol inexistente (400)', async () => {
      await request(app.getHttpServer())
        .post(`${api}/users`)
        .set(asAdmin())
        .send({
          fullName: 'Débil',
          email: `${unique('d')}@aea.test`,
          role: 'REQUESTER',
          password: 'abcdefgh',
        })
        .expect(400);
      await request(app.getHttpServer())
        .post(`${api}/users`)
        .set(asAdmin())
        .send({
          fullName: 'Rol malo',
          email: `${unique('r')}@aea.test`,
          role: 'CASHIER',
          password: 'Clave12345',
        })
        .expect(400);
    });

    it('un REQUESTER no puede listar ni crear usuarios (403)', async () => {
      await request(app.getHttpServer()).get(`${api}/users`).set(asRequester()).expect(403);
      await request(app.getHttpServer())
        .post(`${api}/users`)
        .set(asRequester())
        .send({
          fullName: 'Intruso',
          email: `${unique('i')}@aea.test`,
          role: 'ADMIN',
          password: 'Clave12345',
        })
        .expect(403);
    });

    it('filtra por rol y busca por nombre o correo', async () => {
      const driver = await createUser(dataSource, UserRole.DRIVER, { fullName: 'Pedro Conductor' });
      const response = await request(app.getHttpServer())
        .get(`${api}/users`)
        .query({ role: 'DRIVER', search: 'pedro conductor' })
        .set(asAdmin())
        .expect(200);

      expect(response.body.data.map((u: User) => u.id)).toContain(driver.id);
      expect(response.body.data.every((u: User) => u.role === 'DRIVER')).toBe(true);
    });

    it('un usuario desactivado ya no puede iniciar sesion', async () => {
      const user = await createUser(dataSource, UserRole.REQUESTER);
      await request(app.getHttpServer())
        .delete(`${api}/users/${user.id}`)
        .set(asAdmin())
        .expect(200);
      await request(app.getHttpServer())
        .post(`${api}/auth/login`)
        .send({ email: user.email, password: 'Clave12345' })
        .expect(403);
    });

    it('el ADMIN no puede desactivarse a si mismo (400)', async () => {
      await request(app.getHttpServer())
        .delete(`${api}/users/${admin.id}`)
        .set(asAdmin())
        .expect(400);
    });

    it('el restablecimiento de contraseña permite entrar con la nueva', async () => {
      const user = await createUser(dataSource, UserRole.DRIVER);
      await request(app.getHttpServer())
        .patch(`${api}/users/${user.id}/password`)
        .set(asAdmin())
        .send({ password: 'Restablecida1' })
        .expect(200);
      await loginAs(app, user, 'Restablecida1');
    });

    it('responde 400 a un id que no es uuid y 404 a uno inexistente', async () => {
      await request(app.getHttpServer()).get(`${api}/users/123`).set(asAdmin()).expect(400);
      await request(app.getHttpServer())
        .get(`${api}/users/6f1c2b4e-9d3a-4f5b-8c7d-0e1f2a3b4c5d`)
        .set(asAdmin())
        .expect(404);
    });
  });

  describe('HU-03 — proyectos', () => {
    it('normaliza el codigo a mayusculas y rechaza duplicados', async () => {
      const code = unique('pry-');
      const created = await request(app.getHttpServer())
        .post(`${api}/projects`)
        .set(asAdmin())
        .send({ code: `  ${code} `, name: 'Agua segura' })
        .expect(201);
      expect(created.body.code).toBe(code.toUpperCase());

      await request(app.getHttpServer())
        .post(`${api}/projects`)
        .set(asAdmin())
        .send({ code, name: 'Otro' })
        .expect(409);
    });

    it('el REQUESTER ve solo proyectos activos y no puede crearlos', async () => {
      const active = await request(app.getHttpServer())
        .post(`${api}/projects`)
        .set(asAdmin())
        .send({ code: unique('ACT'), name: 'Activo' })
        .expect(201);
      const inactive = await request(app.getHttpServer())
        .post(`${api}/projects`)
        .set(asAdmin())
        .send({ code: unique('INA'), name: 'Inactivo' })
        .expect(201);
      await request(app.getHttpServer())
        .delete(`${api}/projects/${inactive.body.id}`)
        .set(asAdmin())
        .expect(200);

      // Aunque pida explicitamente los inactivos, el REQUESTER solo recibe activos.
      const list = await request(app.getHttpServer())
        .get(`${api}/projects`)
        .query({ isActive: false, limit: 100 })
        .set(asRequester())
        .expect(200);
      const ids = list.body.data.map((p: { id: string }) => p.id);
      expect(ids).toContain(active.body.id);
      expect(ids).not.toContain(inactive.body.id);

      await request(app.getHttpServer())
        .get(`${api}/projects/${inactive.body.id}`)
        .set(asRequester())
        .expect(404);
      await request(app.getHttpServer())
        .post(`${api}/projects`)
        .set(asRequester())
        .send({ code: unique('NO'), name: 'No permitido' })
        .expect(403);
    });

    it('el ADMIN si ve los inactivos cuando los filtra', async () => {
      const response = await request(app.getHttpServer())
        .get(`${api}/projects`)
        .query({ isActive: false })
        .set(asAdmin())
        .expect(200);
      expect(response.body.data.every((p: { isActive: boolean }) => !p.isActive)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });

    it('rechaza un codigo con caracteres no permitidos (400)', async () => {
      await request(app.getHttpServer())
        .post(`${api}/projects`)
        .set(asAdmin())
        .send({ code: 'PRY AGUA!', name: 'Inválido' })
        .expect(400);
    });
  });
});
