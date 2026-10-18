import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import { Notification } from '#modules/notifications/entities/notification.entity.js';
import type { Project } from '#modules/projects/entities/project.entity.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';
import { createProject, createUser, createVehicle, loginAs } from './fixtures.js';

/** HU-09 — crear y consultar solicitudes (RF-10, RN-06, RN-07, RN-14). */
describe('Solicitudes (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let admin: User;
  let ana: User;
  let carlos: User;
  let project: Project;
  const tokens: Record<string, string> = {};
  const api = '/api/v1';
  const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  /** Un horario futuro y válido, a `days` días de hoy. */
  const window = (days = 3, startHour = 8, hours = 4) => {
    const start = new Date(Date.now() + days * 86_400_000);
    start.setUTCHours(startHour + 6, 0, 0, 0); // hora de Managua
    return {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + hours * 3_600_000).toISOString(),
    };
  };

  const body = () => ({
    projectId: project.id,
    purpose: 'Taller de liderazgo juvenil',
    destination: 'Comunidad El Rosario',
    passengers: 3,
    ...window(),
  });

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
    admin = await createUser(dataSource, UserRole.ADMIN);
    ana = await createUser(dataSource, UserRole.REQUESTER, { fullName: 'Ana Martínez' });
    carlos = await createUser(dataSource, UserRole.REQUESTER, { fullName: 'Carlos Rivera' });
    const driver = await createUser(dataSource, UserRole.DRIVER);
    project = await createProject(dataSource);
    tokens.admin = await loginAs(app, admin);
    tokens.ana = await loginAs(app, ana);
    tokens.carlos = await loginAs(app, carlos);
    tokens.driver = await loginAs(app, driver);
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  const create = (who: string, payload: object) =>
    request(app.getHttpServer()).post(`${api}/reservations`).set(as(who)).send(payload);

  describe('crear', () => {
    it('queda pendiente, con codigo legible y a nombre de quien la pide', async () => {
      const response = await create('ana', body()).expect(201);
      expect(response.body).toMatchObject({
        status: 'PENDING',
        resourceType: 'VEHICLE',
        requester: { id: ana.id, fullName: 'Ana Martínez' },
        project: { id: project.id },
        preferredResource: null,
      });
      expect(response.body.code).toMatch(/^SOL-\d{4}-\d{5}$/);
    });

    it('avisa a la coordinacion con una notificacion interna', async () => {
      const response = await create('ana', body()).expect(201);
      const notes = await dataSource.getRepository(Notification).findBy({ userId: admin.id });
      expect(
        notes.some(
          (n) => (n.data as { reservationId?: string })?.reservationId === response.body.id,
        ),
      ).toBe(true);
      expect(notes.find((n) => n.title.includes(response.body.code))?.body).toMatch(/Ana Martínez/);
    });

    it('cada solicitud recibe un codigo distinto', async () => {
      const [a, b] = await Promise.all([create('ana', body()), create('carlos', body())]);
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.code).not.toBe(b.body.code);
    });

    it('rechaza un horario invalido o en el pasado (RN-06)', async () => {
      const { startsAt } = window();
      for (const bad of [
        { ...body(), endsAt: startsAt },
        { ...body(), startsAt: '2020-01-01T08:00:00-06:00', endsAt: '2020-01-01T12:00:00-06:00' },
      ]) {
        const response = await create('ana', bad).expect(400);
        expect(response.body.message).toMatch(/posterior|pasado/);
      }
    });

    it('rechaza un proyecto cerrado', async () => {
      const closed = await createProject(dataSource);
      await dataSource.query(`UPDATE project SET is_active = false WHERE id = $1`, [closed.id]);
      const response = await create('ana', { ...body(), projectId: closed.id }).expect(400);
      expect(response.body.message).toMatch(/proyecto/);
    });

    it('acepta un medio preferido valido y rechaza uno dado de baja', async () => {
      const vehicle = await createVehicle(dataSource);
      const ok = await create('ana', { ...body(), preferredResourceId: vehicle.id }).expect(201);
      expect(ok.body.preferredResource).toMatchObject({ id: vehicle.id, name: vehicle.name });

      await dataSource.query(`UPDATE resource SET status = 'INACTIVE' WHERE id = $1`, [vehicle.id]);
      await create('ana', { ...body(), preferredResourceId: vehicle.id }).expect(400);
    });

    it('un tecnico no puede pedir en nombre de otra persona (403), la coordinacion si (RN-14)', async () => {
      await create('ana', { ...body(), requesterId: carlos.id }).expect(403);
      const onBehalf = await create('admin', { ...body(), requesterId: carlos.id }).expect(201);
      expect(onBehalf.body.requester.id).toBe(carlos.id);
    });

    it('un conductor no gestiona solicitudes (403)', async () => {
      await create('driver', body()).expect(403);
    });

    it('rechaza pasajeros fuera de rango y campos de mas (400)', async () => {
      await create('ana', { ...body(), passengers: 0 }).expect(400);
      await create('ana', { ...body(), status: 'APPROVED' }).expect(400);
    });
  });

  describe('consultar', () => {
    it('un tecnico solo ve sus solicitudes, aunque filtre', async () => {
      const mine = await create('carlos', body()).expect(201);
      const list = await request(app.getHttpServer())
        .get(`${api}/reservations?limit=100`)
        .set(as('carlos'))
        .expect(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      expect(
        list.body.data.every((r: { requester: { id: string } }) => r.requester.id === carlos.id),
      ).toBe(true);
      expect(list.body.data.map((r: { id: string }) => r.id)).toContain(mine.body.id);
    });

    it('la solicitud de otra persona responde 404, no 403', async () => {
      const anas = await create('ana', body()).expect(201);
      await request(app.getHttpServer())
        .get(`${api}/reservations/${anas.body.id}`)
        .set(as('carlos'))
        .expect(404);
      await request(app.getHttpServer())
        .get(`${api}/reservations/${anas.body.id}`)
        .set(as('admin'))
        .expect(200);
    });

    it('la coordinacion ve todas y busca por codigo', async () => {
      const created = await create('ana', body()).expect(201);
      const list = await request(app.getHttpServer())
        .get(`${api}/reservations`)
        .query({ status: 'PENDING', search: created.body.code })
        .set(as('admin'))
        .expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.data[0].id).toBe(created.body.id);
    });

    it('una pendiente con medio preferido aparece en la agenda sin ocuparlo (RN-07)', async () => {
      const vehicle = await createVehicle(dataSource);
      const when = window(5, 9, 3);
      await create('ana', { ...body(), ...when, preferredResourceId: vehicle.id }).expect(201);

      const from = new Date(new Date(when.startsAt).getTime() - 3 * 3_600_000).toISOString();
      const to = new Date(new Date(when.endsAt).getTime() + 3 * 3_600_000).toISOString();
      const agenda = await request(app.getHttpServer())
        .get(`${api}/agenda`)
        .query({ from, to })
        .set(as('admin'))
        .expect(200);
      const row = agenda.body.rows.find((r: { id: string }) => r.id === vehicle.id);
      expect(row.blocks).toEqual([
        expect.objectContaining({ source: 'REQUEST', state: 'PENDING' }),
      ]);

      const availability = await request(app.getHttpServer())
        .get(`${api}/availability`)
        .query({ from: when.startsAt, to: when.endsAt })
        .set(as('ana'))
        .expect(200);
      expect(availability.body.available.map((r: { id: string }) => r.id)).toContain(vehicle.id);
    });
  });
});
