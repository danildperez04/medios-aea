import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import { AuditLog } from '#modules/audit/entities/audit-log.entity.js';
import type { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Notification } from '#modules/notifications/entities/notification.entity.js';
import type { Project } from '#modules/projects/entities/project.entity.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';
import { createDriver, createProject, createUser, createVehicle, signToken } from './fixtures.js';

/**
 * HU-11, HU-12 y HU-13 — aprobar, rechazar y reasignar sin choques (RF-12, RF-14, RN-01 a
 * RN-05, RN-08, RN-09, ADR 0004). Casos PT-01 a PT-10 de docs/12-plan-pruebas.md.
 * Cada prueba usa sus propios medios y conductores para no chocar con las demás.
 */
describe('Aprobacion de solicitudes (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let admin: User;
  let ana: User;
  let carlos: User;
  let anaDriver: Driver;
  let project: Project;
  const tokens: Record<string, string> = {};
  const api = '/api/v1';
  const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  /** Horario a `days` días de hoy, de `startHour` (hora de Managua) por `hours` horas. */
  const window = (days: number, startHour = 8, hours = 4) => {
    const start = new Date(Date.now() + days * 86_400_000);
    start.setUTCHours(startHour + 6, 0, 0, 0);
    return {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + hours * 3_600_000).toISOString(),
    };
  };

  /** Solicitud pendiente de Ana (conduce ella) o de quien se indique. */
  const pending = async (when: object, extra: object = {}, who = 'ana') => {
    const response = await request(app.getHttpServer())
      .post(`${api}/reservations`)
      .set(as(who))
      .send({
        projectId: project.id,
        purpose: 'Taller de liderazgo juvenil',
        destination: 'Comunidad El Rosario',
        passengers: 3,
        ...when,
        ...extra,
      });
    expect(response.status).toBe(201);
    return response.body as { id: string; code: string };
  };

  const approve = (id: string, body: object, who = 'admin') =>
    request(app.getHttpServer()).post(`${api}/reservations/${id}/approve`).set(as(who)).send(body);

  const notesFor = async (userId: string, reservationId: string) =>
    (await dataSource.getRepository(Notification).findBy({ userId })).filter(
      (n) => (n.data as { reservationId?: string } | null)?.reservationId === reservationId,
    );

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
    admin = await createUser(dataSource, UserRole.ADMIN);
    ana = await createUser(dataSource, UserRole.REQUESTER, { fullName: 'Ana Martínez' });
    carlos = await createUser(dataSource, UserRole.REQUESTER, { fullName: 'Carlos Rivera' });
    anaDriver = await createDriver(dataSource, '2035-12-31', ana);
    project = await createProject(dataSource);
    for (const [name, user] of Object.entries({ admin, ana, carlos })) {
      tokens[name] = await signToken(app, user);
    }
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  describe('aprobar', () => {
    it('asigna el medio y, por defecto, al conductor propuesto; queda en auditoria', async () => {
      const vehicle = await createVehicle(dataSource);
      const when = window(20);
      const created = await pending(when);

      const response = await approve(created.id, { resourceId: vehicle.id }).expect(200);
      expect(response.body).toMatchObject({
        status: 'APPROVED',
        assignment: {
          resource: { id: vehicle.id, name: vehicle.name },
          driver: { id: anaDriver.id, fullName: 'Ana Martínez' },
        },
      });
      expect(response.body.decidedAt).not.toBeNull();

      const audit = await dataSource
        .getRepository(AuditLog)
        .findOneByOrFail({ entityId: created.id, action: 'APPROVE' as never });
      expect(audit).toMatchObject({
        actorId: admin.id,
        payload: { resourceId: vehicle.id, driverId: anaDriver.id, driverChanged: false },
      });

      // Ana pidió y conduce: un solo aviso que lo dice.
      const [note] = await notesFor(ana.id, created.id);
      expect(note.title).toBe(`Solicitud ${created.code} aprobada`);
      expect(note.body).toMatch(/conduces tú/);

      const availability = await request(app.getHttpServer())
        .get(`${api}/availability`)
        .query({ from: when.startsAt, to: when.endsAt })
        .set(as('ana'))
        .expect(200);
      expect(
        availability.body.unavailable.find(
          (u: { resource: { id: string } }) => u.resource.id === vehicle.id,
        )?.reasons,
      ).toEqual(['BUSY']);
    });

    it('la coordinacion puede cambiar al conductor y avisa a los tres (ADR 0004)', async () => {
      const vehicle = await createVehicle(dataSource);
      const jose = await createDriver(dataSource);
      const luis = await createDriver(dataSource);
      const created = await pending(window(21), { proposedDriverId: jose.id }, 'carlos');

      const response = await approve(created.id, {
        resourceId: vehicle.id,
        driverId: luis.id,
      }).expect(200);
      expect(response.body.assignment.driver.id).toBe(luis.id);
      expect(response.body.proposedDriver.id).toBe(jose.id);

      expect((await notesFor(carlos.id, created.id))[0].body).toMatch(/cambió a quien conduce/);
      expect((await notesFor(luis.userId, created.id))[0].title).toMatch(/Tienes un viaje/);
      expect((await notesFor(jose.userId, created.id))[0].title).toMatch(/Ya no conduces/);
      expect(await notesFor(admin.id, created.id)).toHaveLength(1); // solo el de la creación

      const audit = await dataSource
        .getRepository(AuditLog)
        .findOneByOrFail({ entityId: created.id, action: 'APPROVE' as never });
      expect(audit.payload).toMatchObject({ driverChanged: true, proposedDriverId: jose.id });
    });

    it('una solicitud ya aprobada no se aprueba otra vez (409)', async () => {
      const vehicle = await createVehicle(dataSource);
      const created = await pending(window(22));
      await approve(created.id, { resourceId: vehicle.id }).expect(200);
      const again = await approve(created.id, { resourceId: vehicle.id }).expect(409);
      expect(again.body.message).toMatch(/ya no está pendiente/);
    });

    it('un tecnico no aprueba (403, PT-21) y un medio dado de baja no se asigna (400)', async () => {
      const vehicle = await createVehicle(dataSource);
      const created = await pending(window(23));
      await approve(created.id, { resourceId: vehicle.id }, 'ana').expect(403);

      await dataSource.query(`UPDATE resource SET status = 'INACTIVE' WHERE id = $1`, [vehicle.id]);
      await approve(created.id, { resourceId: vehicle.id }).expect(400);
    });
  });

  describe('sin choques', () => {
    it('PT-01 y PT-03: no asigna un medio ocupado en parte o por completo (409)', async () => {
      const vehicle = await createVehicle(dataSource);
      const first = await pending(window(30, 8, 4)); // 08:00–12:00
      await approve(first.id, { resourceId: vehicle.id }).expect(200);

      for (const when of [window(30, 10, 4), window(30, 9, 1)]) {
        const other = await pending(when, {
          proposedDriverId: (await createDriver(dataSource)).id,
        });
        const response = await approve(other.id, { resourceId: vehicle.id }).expect(409);
        expect(response.body.message).toContain(first.code);
      }
    });

    it('PT-02: viajes contiguos no chocan (periodos semiabiertos)', async () => {
      const vehicle = await createVehicle(dataSource);
      const early = await pending(window(31, 6, 2)); // 06:00–08:00
      await approve(early.id, { resourceId: vehicle.id }).expect(200);
      const next = await pending(window(31, 8, 2)); // 08:00–10:00, misma Ana y mismo medio
      await approve(next.id, { resourceId: vehicle.id }).expect(200);
    });

    it('PT-04: el mismo conductor no puede llevar dos medios a la vez (409)', async () => {
      const [hilux, prado] = [await createVehicle(dataSource), await createVehicle(dataSource)];
      const first = await pending(window(32));
      await approve(first.id, { resourceId: hilux.id }).expect(200);
      const second = await pending(window(32));
      const response = await approve(second.id, { resourceId: prado.id }).expect(409);
      expect(response.body.message).toMatch(/Ana Martínez ya conduce otro viaje/);
    });

    it('PT-05: no asigna un medio con un bloqueo en el horario (409)', async () => {
      const vehicle = await createVehicle(dataSource);
      const when = window(33);
      await dataSource.query(
        `INSERT INTO blackout (resource_id, period, reason) VALUES ($1, tstzrange($2, $3, '[)'), 'MAINTENANCE')`,
        [vehicle.id, when.startsAt, when.endsAt],
      );
      const created = await pending(when);
      const response = await approve(created.id, { resourceId: vehicle.id }).expect(409);
      expect(response.body.message).toMatch(/bloqueo/);
    });

    it('PT-06 y PT-07: medio en mantenimiento o sin capacidad (422)', async () => {
      const shop = await createVehicle(dataSource);
      await dataSource.query(`UPDATE resource SET status = 'MAINTENANCE' WHERE id = $1`, [shop.id]);
      const small = await createVehicle(dataSource, { passengerCapacity: 2 });
      const created = await pending(window(34));

      const maintenance = await approve(created.id, { resourceId: shop.id }).expect(422);
      expect(maintenance.body.message).toMatch(/mantenimiento/);
      const capacity = await approve(created.id, { resourceId: small.id }).expect(422);
      expect(capacity.body.message).toMatch(/lleva 2 pasajeros y la solicitud es para 3/);
    });

    it('PT-08: no asigna a alguien con la licencia vencida a la fecha del viaje (422)', async () => {
      const vehicle = await createVehicle(dataSource);
      const when = window(35);
      const dayBefore = new Date(new Date(when.startsAt).getTime() - 86_400_000)
        .toISOString()
        .slice(0, 10);
      const expiring = await createDriver(dataSource, dayBefore);
      const created = await pending(when);

      const response = await approve(created.id, {
        resourceId: vehicle.id,
        driverId: expiring.id,
      }).expect(422);
      expect(response.body.message).toMatch(/no cubre el viaje/);
    });

    it('PT-09: dos aprobaciones simultaneas del mismo medio, una 200 y otra 409', async () => {
      const vehicle = await createVehicle(dataSource);
      const when = window(36);
      const a = await pending(when, { proposedDriverId: (await createDriver(dataSource)).id });
      const b = await pending(when, { proposedDriverId: (await createDriver(dataSource)).id });

      const results = await Promise.all([
        approve(a.id, { resourceId: vehicle.id }),
        approve(b.id, { resourceId: vehicle.id }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });

    it('PT-09: el mismo conductor en dos medios a la vez lo frena la restriccion (409)', async () => {
      // Medios distintos no comparten candado: la garantía es ex_assignment_driver_overlap.
      const [hilux, prado] = [await createVehicle(dataSource), await createVehicle(dataSource)];
      const when = window(37);
      const a = await pending(when);
      const b = await pending(when);

      const results = await Promise.all([
        approve(a.id, { resourceId: hilux.id }),
        approve(b.id, { resourceId: prado.id }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });

    it('PT-10: cancelar una aprobada libera el medio para otra aprobacion', async () => {
      const vehicle = await createVehicle(dataSource);
      const when = window(38);
      const first = await pending(when);
      await approve(first.id, { resourceId: vehicle.id }).expect(200);
      await request(app.getHttpServer())
        .post(`${api}/reservations/${first.id}/cancel`)
        .set(as('ana'))
        .expect(200);

      const second = await pending(when);
      await approve(second.id, { resourceId: vehicle.id }).expect(200);
    });
  });

  /** HU-12 — rechazar con motivo (RF-13, PT-22). */
  describe('rechazar', () => {
    const reject = (id: string, body: object, who = 'admin') =>
      request(app.getHttpServer()).post(`${api}/reservations/${id}/reject`).set(as(who)).send(body);

    it('guarda el motivo, queda en auditoria y avisa a quien pidio con el motivo', async () => {
      const created = await pending(window(40), { proposedDriverId: anaDriver.id }, 'carlos');
      const response = await reject(created.id, {
        reason: '  No hay medios libres por la feria departamental.  ',
      }).expect(200);
      expect(response.body).toMatchObject({
        status: 'REJECTED',
        rejectionReason: 'No hay medios libres por la feria departamental.',
        assignment: null,
      });
      expect(response.body.decidedAt).not.toBeNull();

      const audit = await dataSource
        .getRepository(AuditLog)
        .findOneByOrFail({ entityId: created.id, action: 'REJECT' as never });
      expect(audit).toMatchObject({
        actorId: admin.id,
        payload: { reason: 'No hay medios libres por la feria departamental.' },
      });

      const [note] = await notesFor(carlos.id, created.id);
      expect(note.title).toBe(`Solicitud ${created.code} rechazada`);
      expect(note.body).toMatch(/Motivo: No hay medios libres por la feria departamental\./);
    });

    it('PT-22: sin motivo, en blanco o muy corto responde 400', async () => {
      const created = await pending(window(41));
      for (const body of [{}, { reason: '     ' }, { reason: 'no' }]) {
        const response = await reject(created.id, body).expect(400);
        expect(JSON.stringify(response.body)).toMatch(/motivo/);
      }
    });

    it('una solicitud ya decidida no se rechaza ni se aprueba despues (409)', async () => {
      const vehicle = await createVehicle(dataSource);
      const approved = await pending(window(42));
      await approve(approved.id, { resourceId: vehicle.id }).expect(200);
      await reject(approved.id, { reason: 'Ya no hace falta el viaje' }).expect(409);

      const rejected = await pending(window(43));
      await reject(rejected.id, { reason: 'Se cruza con la feria' }).expect(200);
      await approve(rejected.id, { resourceId: vehicle.id }).expect(409);
      await request(app.getHttpServer())
        .post(`${api}/reservations/${rejected.id}/cancel`)
        .set(as('ana'))
        .expect(409);
    });

    it('un tecnico no rechaza (403)', async () => {
      const created = await pending(window(44));
      await reject(created.id, { reason: 'Me arrepentí del viaje' }, 'ana').expect(403);
    });

    it('aprobar y rechazar a la vez: solo una decision gana (409 la otra)', async () => {
      const vehicle = await createVehicle(dataSource);
      const created = await pending(window(45));
      const results = await Promise.all([
        approve(created.id, { resourceId: vehicle.id }),
        reject(created.id, { reason: 'No hay presupuesto de combustible' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });
  });

  /** HU-13 — reasignar medio o conductor (RF-15, RN-10). */
  describe('reasignar', () => {
    const reassign = (id: string, body: object, who = 'admin') =>
      request(app.getHttpServer())
        .post(`${api}/reservations/${id}/reassign`)
        .set(as(who))
        .send(body);

    const assignments = (requestId: string) =>
      dataSource.query<{ id: string; resource_id: string; driver_id: string; active: boolean }[]>(
        `SELECT id, resource_id, driver_id, active FROM reservation_assignment
          WHERE request_id = $1 ORDER BY created_at`,
        [requestId],
      );

    it('cambia el medio: la asignacion anterior queda inactiva y el medio, libre', async () => {
      const [hilux, prado] = [await createVehicle(dataSource), await createVehicle(dataSource)];
      const when = window(50);
      const created = await pending(when);
      await approve(created.id, { resourceId: hilux.id }).expect(200);

      const response = await reassign(created.id, { resourceId: prado.id }).expect(200);
      expect(response.body).toMatchObject({
        status: 'APPROVED',
        assignment: { resource: { id: prado.id }, driver: { id: anaDriver.id } },
      });

      const rows = await assignments(created.id);
      expect(rows.map((r) => [r.resource_id, r.active])).toEqual([
        [hilux.id, false],
        [prado.id, true],
      ]);
      const audit = await dataSource
        .getRepository(AuditLog)
        .findOneByOrFail({ entityId: created.id, action: 'REASSIGN' as never });
      expect(audit.payload).toMatchObject({
        from: { resourceId: hilux.id, driverId: anaDriver.id },
        to: { resourceId: prado.id, driverId: anaDriver.id },
      });

      // Ana pidió y conduce: un solo aviso.
      const notes = (await notesFor(ana.id, created.id)).filter((n) =>
        n.title.startsWith('Cambió'),
      );
      expect(notes.map((n) => n.title)).toEqual([`Cambió tu viaje ${created.code}`]);

      // La Hilux quedó libre en ese horario (RN-10).
      const other = await pending(when, { proposedDriverId: (await createDriver(dataSource)).id });
      await approve(other.id, { resourceId: hilux.id }).expect(200);
    });

    it('cambia quien conduce en el mismo medio y avisa a los tres', async () => {
      const vehicle = await createVehicle(dataSource);
      const jose = await createDriver(dataSource);
      const luis = await createDriver(dataSource);
      const created = await pending(window(51), { proposedDriverId: jose.id }, 'carlos');
      await approve(created.id, { resourceId: vehicle.id }).expect(200);

      // Mismo medio y mismo horario: la asignación propia no cuenta como choque.
      const response = await reassign(created.id, { driverId: luis.id }).expect(200);
      expect(response.body.assignment).toMatchObject({
        resource: { id: vehicle.id },
        driver: { id: luis.id },
      });

      const titles = async (userId: string) =>
        (await notesFor(userId, created.id)).map((n) => n.title);
      expect(await titles(carlos.id)).toContain(`Cambió tu viaje ${created.code}`);
      expect(await titles(luis.userId)).toContain(`Tienes un viaje asignado: ${created.code}`);
      expect(await titles(jose.userId)).toContain(`Ya no conduces el viaje ${created.code}`);
    });

    it('si solo cambia el medio, quien conduce se entera de en cual va', async () => {
      const [hilux, prado] = [await createVehicle(dataSource), await createVehicle(dataSource)];
      const jose = await createDriver(dataSource);
      const created = await pending(window(52), { proposedDriverId: jose.id }, 'carlos');
      await approve(created.id, { resourceId: hilux.id }).expect(200);
      await reassign(created.id, { resourceId: prado.id }).expect(200);

      const [note] = (await notesFor(jose.userId, created.id)).filter((n) =>
        n.title.startsWith('Cambió el medio'),
      );
      expect(note.body).toContain(prado.name);
    });

    it('no reasigna a un medio o conductor ocupado (409) ni sin cambios (400)', async () => {
      const [hilux, prado] = [await createVehicle(dataSource), await createVehicle(dataSource)];
      const when = window(53);
      const busy = await pending(when, { proposedDriverId: (await createDriver(dataSource)).id });
      await approve(busy.id, { resourceId: prado.id }).expect(200);
      const created = await pending(when);
      await approve(created.id, { resourceId: hilux.id }).expect(200);

      const clash = await reassign(created.id, { resourceId: prado.id }).expect(409);
      expect(clash.body.message).toContain(busy.code);
      const same = await reassign(created.id, { resourceId: hilux.id }).expect(400);
      expect(same.body.message).toMatch(/No hay cambios/);
      await reassign(created.id, { driverId: null }).expect(400);
    });

    it('solo una aprobada cuyo viaje no inicio; solo la coordinacion (403, 409)', async () => {
      const vehicle = await createVehicle(dataSource);
      const pendingOne = await pending(window(54));
      await reassign(pendingOne.id, { resourceId: vehicle.id }).expect(409);

      const started = await pending(window(55));
      const approved = await approve(started.id, { resourceId: vehicle.id }).expect(200);
      await reassign(started.id, { resourceId: vehicle.id }, 'ana').expect(403);
      await dataSource.query(
        `INSERT INTO trip_log (assignment_id, started_at, start_odometer, start_fuel_level)
         VALUES ($1, now(), 10000, 80)`,
        [approved.body.assignment.id],
      );
      const response = await reassign(started.id, {
        resourceId: (await createVehicle(dataSource)).id,
      }).expect(409);
      expect(response.body.message).toMatch(/ya inició/);
    });

    it('reasignar y aprobar a la vez hacia el mismo medio: una 200 y otra 409', async () => {
      const [hilux, prado] = [await createVehicle(dataSource), await createVehicle(dataSource)];
      const when = window(56);
      const approvedOne = await pending(when);
      await approve(approvedOne.id, { resourceId: hilux.id }).expect(200);
      const other = await pending(when, { proposedDriverId: (await createDriver(dataSource)).id });

      const results = await Promise.all([
        reassign(approvedOne.id, { resourceId: prado.id }),
        approve(other.id, { resourceId: prado.id }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });
  });
});
