import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { RequestStatus, UserRole } from '#common/enums/domain.enums.js';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';
import { ReservationRequest } from '#modules/reservations/entities/reservation-request.entity.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations, unique } from './e2e-context.js';
import { createDriver, createProject, createUser, createVehicle, loginAs } from './fixtures.js';

/**
 * Sprint 2 — flota y disponibilidad (HU-05 a HU-08; PT-01 a PT-08 sobre la consulta).
 * Las asignaciones se insertan directo en la base: aprobarlas por API llega en el Sprint 3.
 */
describe('Flota y disponibilidad (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let admin: User;
  let adminToken: string;
  let requesterToken: string;
  const api = '/api/v1';
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });
  const asRequester = () => ({ Authorization: `Bearer ${requesterToken}` });

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

  /** Inserta una asignación activa aprobada (lo que hará la aprobación en el Sprint 3). */
  async function assign(
    resourceId: string,
    start: string,
    end: string,
    driverId: string | null = null,
  ) {
    const requester = await createUser(dataSource, UserRole.REQUESTER);
    const project = await createProject(dataSource);
    const req = await dataSource.getRepository(ReservationRequest).save(
      dataSource.getRepository(ReservationRequest).create({
        code: unique('SOL'),
        requesterId: requester.id,
        projectId: project.id,
        purpose: 'Taller comunitario',
        destination: 'El Rosario',
        passengers: 2,
        startsAt: new Date(start),
        endsAt: new Date(end),
        status: RequestStatus.APPROVED,
      }),
    );
    return dataSource.getRepository(ReservationAssignment).save(
      dataSource.getRepository(ReservationAssignment).create({
        requestId: req.id,
        resourceId,
        driverId,
        period: { start: new Date(start), end: new Date(end) },
        active: true,
      }),
    );
  }

  const body = {
    name: 'Hilux blanca',
    brand: 'Toyota',
    model: 'Hilux',
    year: 2022,
    passengerCapacity: 4,
    fuelType: 'DIESEL',
    currentOdometer: 45200,
  };

  describe('HU-05 — vehiculos', () => {
    it('crea el medio y su detalle en una sola operacion', async () => {
      const plate = unique('m ', 12);
      const created = await request(app.getHttpServer())
        .post(`${api}/vehicles`)
        .set(asAdmin())
        .send({ ...body, plate })
        .expect(201);

      expect(created.body).toMatchObject({
        type: 'VEHICLE',
        status: 'AVAILABLE',
        plate: plate.toUpperCase(),
        passengerCapacity: 4,
        currentOdometer: 45200,
      });
    });

    it('rechaza una placa repetida (409) sin dejar un medio huerfano', async () => {
      const plate = unique('P', 10);
      await request(app.getHttpServer())
        .post(`${api}/vehicles`)
        .set(asAdmin())
        .send({ ...body, plate })
        .expect(201);
      const before = await dataSource.query(`SELECT count(*)::int AS n FROM resource`);
      await request(app.getHttpServer())
        .post(`${api}/vehicles`)
        .set(asAdmin())
        .send({ ...body, plate: plate.toLowerCase() })
        .expect(409);
      const after = await dataSource.query(`SELECT count(*)::int AS n FROM resource`);
      expect(after[0].n).toBe(before[0].n);
    });

    it('valida capacidad, combustible y formato de placa (400)', async () => {
      for (const bad of [
        { ...body, plate: unique('V', 10), passengerCapacity: 0 },
        { ...body, plate: unique('V', 10), fuelType: 'ELECTRIC' },
        { ...body, plate: 'M!' },
      ]) {
        await request(app.getHttpServer())
          .post(`${api}/vehicles`)
          .set(asAdmin())
          .send(bad)
          .expect(400);
      }
    });

    it('no deja bajar el kilometraje (RN-11)', async () => {
      const vehicle = await createVehicle(dataSource, { currentOdometer: 10_000 });
      await request(app.getHttpServer())
        .patch(`${api}/vehicles/${vehicle.id}`)
        .set(asAdmin())
        .send({ currentOdometer: 9_000 })
        .expect(400);
      const ok = await request(app.getHttpServer())
        .patch(`${api}/vehicles/${vehicle.id}`)
        .set(asAdmin())
        .send({ currentOdometer: 10_500, status: 'MAINTENANCE' })
        .expect(200);
      expect(ok.body).toMatchObject({ currentOdometer: 10_500, status: 'MAINTENANCE' });
    });

    it('dar de baja lo saca del listado por defecto', async () => {
      const vehicle = await createVehicle(dataSource);
      await request(app.getHttpServer())
        .delete(`${api}/vehicles/${vehicle.id}`)
        .set(asAdmin())
        .expect(200);
      const list = await request(app.getHttpServer())
        .get(`${api}/vehicles?limit=100`)
        .set(asAdmin())
        .expect(200);
      expect(list.body.data.map((v: { id: string }) => v.id)).not.toContain(vehicle.id);
      const inactive = await request(app.getHttpServer())
        .get(`${api}/vehicles?status=INACTIVE&limit=100`)
        .set(asAdmin())
        .expect(200);
      expect(inactive.body.data.map((v: { id: string }) => v.id)).toContain(vehicle.id);
    });

    it('un REQUESTER no gestiona vehiculos (403)', async () => {
      await request(app.getHttpServer()).get(`${api}/vehicles`).set(asRequester()).expect(403);
    });
  });

  describe('HU-06 — conductores', () => {
    it('registra la licencia de un usuario DRIVER', async () => {
      const user = await createUser(dataSource, UserRole.DRIVER);
      const created = await request(app.getHttpServer())
        .post(`${api}/drivers`)
        .set(asAdmin())
        .send({ userId: user.id, licenseNumber: unique('lic-'), licenseExpiry: '2030-12-31' })
        .expect(201);
      expect(created.body).toMatchObject({
        userId: user.id,
        fullName: user.fullName,
        licenseStatus: 'VALID',
      });
    });

    it('registra la licencia de un tecnico: el personal tecnico conduce (ADR 0004)', async () => {
      const requester = await createUser(dataSource, UserRole.REQUESTER);
      await request(app.getHttpServer())
        .post(`${api}/drivers`)
        .set(asAdmin())
        .send({ userId: requester.id, licenseNumber: unique('L'), licenseExpiry: '2030-01-01' })
        .expect(201);
    });

    it('rechaza a un usuario desactivado (400) y a un conductor repetido (409)', async () => {
      const inactive = await createUser(dataSource, UserRole.REQUESTER, { isActive: false });
      await request(app.getHttpServer())
        .post(`${api}/drivers`)
        .set(asAdmin())
        .send({ userId: inactive.id, licenseNumber: unique('L'), licenseExpiry: '2030-01-01' })
        .expect(400);
      const driver = await createDriver(dataSource);
      await request(app.getHttpServer())
        .post(`${api}/drivers`)
        .set(asAdmin())
        .send({ userId: driver.userId, licenseNumber: unique('L'), licenseExpiry: '2030-01-01' })
        .expect(409);
    });

    it('quien solicita ve a las personas habilitadas para conducir, sin su licencia (RN-15)', async () => {
      const valid = await createDriver(dataSource, '2035-01-01');
      const expired = await createDriver(dataSource, '2020-01-01');
      const inactive = await createDriver(dataSource, '2035-01-01');
      await dataSource.query(`UPDATE driver SET is_active = false WHERE id = $1`, [inactive.id]);

      const options = await request(app.getHttpServer())
        .get(`${api}/drivers/options`)
        .set(asRequester())
        .expect(200);
      const ids = options.body.map((o: { id: string }) => o.id);
      expect(ids).toContain(valid.id);
      expect(ids).not.toContain(expired.id);
      expect(ids).not.toContain(inactive.id);
      expect(Object.keys(options.body[0]).sort()).toEqual(
        ['fullName', 'id', 'licenseExpiry', 'userId'].sort(),
      );

      // La gestión completa, con números de licencia, sigue siendo solo del ADMIN.
      await request(app.getHttpServer()).get(`${api}/drivers`).set(asRequester()).expect(403);
    });

    it('lista las licencias vencidas o por vencer para el aviso del dashboard', async () => {
      const expired = await createDriver(dataSource, '2020-01-01');
      const valid = await createDriver(dataSource, '2035-01-01');
      const response = await request(app.getHttpServer())
        .get(`${api}/drivers?expiringWithinDays=30&limit=100`)
        .set(asAdmin())
        .expect(200);
      const ids = response.body.data.map((d: { id: string }) => d.id);
      expect(ids).toContain(expired.id);
      expect(ids).not.toContain(valid.id);
      expect(
        response.body.data.find((d: { id: string }) => d.id === expired.id).licenseStatus,
      ).toBe('EXPIRED');
    });

    it('rechaza una fecha de vencimiento mal formada (400)', async () => {
      const user = await createUser(dataSource, UserRole.DRIVER);
      await request(app.getHttpServer())
        .post(`${api}/drivers`)
        .set(asAdmin())
        .send({ userId: user.id, licenseNumber: unique('L'), licenseExpiry: '31/12/2030' })
        .expect(400);
    });
  });

  describe('HU-07 — bloqueos', () => {
    it('bloquea un medio y lo lista entre los proximos', async () => {
      const vehicle = await createVehicle(dataSource);
      await request(app.getHttpServer())
        .post(`${api}/resources/${vehicle.id}/blackouts`)
        .set(asAdmin())
        .send({
          startsAt: '2030-01-10T07:00:00-06:00',
          endsAt: '2030-01-11T17:00:00-06:00',
          reason: 'MAINTENANCE',
        })
        .expect(201);
      const list = await request(app.getHttpServer())
        .get(`${api}/resources/${vehicle.id}/blackouts`)
        .set(asAdmin())
        .expect(200);
      expect(list.body).toHaveLength(1);
      expect(new Date(list.body[0].startsAt).toISOString()).toBe('2030-01-10T13:00:00.000Z');
    });

    it('rechaza un bloqueo que choca con un viaje aprobado e indica cual (409)', async () => {
      const vehicle = await createVehicle(dataSource);
      await assign(vehicle.id, '2030-02-01T14:00:00Z', '2030-02-01T18:00:00Z');
      const response = await request(app.getHttpServer())
        .post(`${api}/resources/${vehicle.id}/blackouts`)
        .set(asAdmin())
        .send({
          startsAt: '2030-02-01T16:00:00Z',
          endsAt: '2030-02-02T16:00:00Z',
          reason: 'MAINTENANCE',
        })
        .expect(409);
      expect(response.body.message).toMatch(/viaje aprobado/);
      expect(response.body.details[0]).toMatchObject({ kind: 'ASSIGNMENT' });
    });

    it('acepta un bloqueo contiguo a un viaje (rango semiabierto)', async () => {
      const vehicle = await createVehicle(dataSource);
      await assign(vehicle.id, '2030-03-01T14:00:00Z', '2030-03-01T18:00:00Z');
      await request(app.getHttpServer())
        .post(`${api}/resources/${vehicle.id}/blackouts`)
        .set(asAdmin())
        .send({
          startsAt: '2030-03-01T18:00:00Z',
          endsAt: '2030-03-01T22:00:00Z',
          reason: 'ADMINISTRATIVE',
        })
        .expect(201);
    });

    it('rechaza fin anterior al inicio (400) y un medio inexistente (404)', async () => {
      const vehicle = await createVehicle(dataSource);
      await request(app.getHttpServer())
        .post(`${api}/resources/${vehicle.id}/blackouts`)
        .set(asAdmin())
        .send({ startsAt: '2030-04-02T00:00:00Z', endsAt: '2030-04-01T00:00:00Z', reason: 'OTHER' })
        .expect(400);
      await request(app.getHttpServer())
        .post(`${api}/resources/6f1c2b4e-9d3a-4f5b-8c7d-0e1f2a3b4c5d/blackouts`)
        .set(asAdmin())
        .send({ startsAt: '2030-04-01T00:00:00Z', endsAt: '2030-04-02T00:00:00Z', reason: 'OTHER' })
        .expect(404);
    });
  });

  describe('HU-08 — disponibilidad', () => {
    // Una ventana propia para que los medios de otras pruebas no interfieran.
    const from = '2031-05-04T08:00:00-06:00';
    const to = '2031-05-04T12:00:00-06:00';

    async function availability(query: Record<string, string | number>) {
      const response = await request(app.getHttpServer())
        .get(`${api}/availability`)
        .query({ from, to, ...query })
        .set(asRequester())
        .expect(200);
      const reasonsOf = (id: string): string[] | null => {
        if (response.body.available.some((r: { id: string }) => r.id === id)) return [];
        const hit = response.body.unavailable.find(
          (u: { resource: { id: string } }) => u.resource.id === id,
        );
        return hit ? hit.reasons : null;
      };
      return reasonsOf;
    }

    it('explica por que cada medio no esta libre (PT-01, PT-02, PT-05, PT-06, PT-07)', async () => {
      const free = await createVehicle(dataSource);
      const overlapping = await createVehicle(dataSource);
      await assign(overlapping.id, '2031-05-04T10:00:00-06:00', '2031-05-04T14:00:00-06:00');
      const contiguous = await createVehicle(dataSource);
      await assign(contiguous.id, '2031-05-04T06:00:00-06:00', '2031-05-04T08:00:00-06:00');
      const blocked = await createVehicle(dataSource);
      await request(app.getHttpServer())
        .post(`${api}/resources/${blocked.id}/blackouts`)
        .set(asAdmin())
        .send({
          startsAt: '2031-05-04T00:00:00-06:00',
          endsAt: '2031-05-05T00:00:00-06:00',
          reason: 'MAINTENANCE',
        })
        .expect(201);
      const inShop = await createVehicle(dataSource);
      await request(app.getHttpServer())
        .patch(`${api}/vehicles/${inShop.id}`)
        .set(asAdmin())
        .send({ status: 'MAINTENANCE' })
        .expect(200);
      const small = await createVehicle(dataSource, { passengerCapacity: 2 });

      const reasonsOf = await availability({ passengers: 3 });
      expect(reasonsOf(free.id)).toEqual([]);
      expect(reasonsOf(overlapping.id)).toEqual(['BUSY']);
      expect(reasonsOf(contiguous.id)).toEqual([]);
      expect(reasonsOf(blocked.id)).toEqual(['BLOCKED']);
      expect(reasonsOf(inShop.id)).toEqual(['MAINTENANCE']);
      expect(reasonsOf(small.id)).toEqual(['CAPACITY']);
    });

    it('no incluye medios dados de baja', async () => {
      const retired = await createVehicle(dataSource);
      await request(app.getHttpServer())
        .delete(`${api}/vehicles/${retired.id}`)
        .set(asAdmin())
        .expect(200);
      const reasonsOf = await availability({});
      expect(reasonsOf(retired.id)).toBeNull();
    });

    it('valida el rango: fin posterior y no mas de 31 dias (400)', async () => {
      await request(app.getHttpServer())
        .get(`${api}/availability`)
        .query({ from: to, to: from })
        .set(asRequester())
        .expect(400);
      await request(app.getHttpServer())
        .get(`${api}/availability`)
        .query({ from, to: '2031-07-01T00:00:00-06:00' })
        .set(asRequester())
        .expect(400);
    });

    it('conductores: excluye licencia vencida y conductor ocupado (PT-04, PT-08)', async () => {
      const free = await createDriver(dataSource, '2040-01-01');
      const expired = await createDriver(dataSource, '2031-05-03');
      const busy = await createDriver(dataSource, '2040-01-01');
      const vehicle = await createVehicle(dataSource);
      await assign(vehicle.id, '2031-05-04T09:00:00-06:00', '2031-05-04T10:00:00-06:00', busy.id);

      const response = await request(app.getHttpServer())
        .get(`${api}/availability/drivers`)
        .query({ from, to })
        .set(asAdmin())
        .expect(200);
      const reasons = (id: string) =>
        response.body.unavailable.find((u: { driver: { id: string } }) => u.driver.id === id)
          ?.reasons ?? [];
      expect(response.body.available.map((d: { id: string }) => d.id)).toContain(free.id);
      expect(reasons(expired.id)).toEqual(['LICENSE_EXPIRED']);
      expect(reasons(busy.id)).toEqual(['BUSY']);
    });

    it('la disponibilidad de conductores es solo para el ADMIN (403)', async () => {
      await request(app.getHttpServer())
        .get(`${api}/availability/drivers`)
        .query({ from, to })
        .set(asRequester())
        .expect(403);
    });
  });

  describe('agenda', () => {
    it('devuelve una fila por medio con viajes, bloqueos y mantenimiento', async () => {
      const vehicle = await createVehicle(dataSource, { plate: unique('AG', 10) });
      await assign(vehicle.id, '2032-06-01T08:00:00-06:00', '2032-06-01T12:00:00-06:00');
      await request(app.getHttpServer())
        .post(`${api}/resources/${vehicle.id}/blackouts`)
        .set(asAdmin())
        .send({
          startsAt: '2032-06-01T14:00:00-06:00',
          endsAt: '2032-06-01T17:00:00-06:00',
          reason: 'MAINTENANCE',
          description: 'Cambio de aceite',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`${api}/agenda`)
        .query({ from: '2032-06-01T00:00:00-06:00', to: '2032-06-02T00:00:00-06:00' })
        .set(asAdmin())
        .expect(200);
      const row = response.body.rows.find((r: { id: string }) => r.id === vehicle.id);
      expect(row.identifier).toMatch(/^AG/);
      expect(
        row.blocks.map((b: { source: string; state: string; label: string }) => [
          b.source,
          b.state,
          b.label,
        ]),
      ).toEqual([
        ['ASSIGNMENT', 'ASSIGNED', expect.stringContaining('El Rosario')],
        ['BLACKOUT', 'UNAVAILABLE', 'Cambio de aceite'],
      ]);
    });

    it('la agenda es solo para el ADMIN (403)', async () => {
      await request(app.getHttpServer())
        .get(`${api}/agenda`)
        .query({ from: '2032-06-01T00:00:00-06:00', to: '2032-06-02T00:00:00-06:00' })
        .set(asRequester())
        .expect(403);
    });
  });
});
