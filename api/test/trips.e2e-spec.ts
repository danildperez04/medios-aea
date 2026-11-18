import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import { SessionService } from '#modules/auth/session.service.js';
import type { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Notification } from '#modules/notifications/entities/notification.entity.js';
import type { Project } from '#modules/projects/entities/project.entity.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';
import { createDriver, createProject, createUser, createVehicle, PASSWORD } from './fixtures.js';

/**
 * "Mis viajes" (HU-20, RF-21): los viajes son de quien está asignado como conductor,
 * tenga el rol que tenga (RN-16, ADR 0004).
 */
describe('Mis viajes (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let project: Project;
  let admin: User;
  let adminToken: string;
  const api = '/api/v1';
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
    project = await createProject(dataSource);
    admin = await createUser(dataSource, UserRole.ADMIN);
    adminToken = await tokenOf(admin);
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  /** Con el servicio y no por HTTP: el login tiene un límite de 10 por minuto. */
  async function tokenOf(user: User): Promise<string> {
    const session = await app
      .get(SessionService)
      .start({ email: user.email, password: PASSWORD }, 'mobile');
    return session.accessToken;
  }

  /** Una persona con licencia, del rol pedido, y su token. */
  async function driverOf(role: UserRole, overrides: Partial<User> = {}) {
    const user = await createUser(dataSource, role, overrides);
    const driver = await createDriver(dataSource, '2035-12-31', user);
    return { user, driver, token: await tokenOf(user) };
  }

  /** Horario a `days` días de hoy, desde `hour` (hora de Managua) por 4 horas. */
  const window = (days: number, hour = 8) => {
    const start = new Date(Date.now() + days * 86_400_000);
    start.setUTCHours(hour + 6, 0, 0, 0);
    return {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 4 * 3_600_000).toISOString(),
    };
  };

  /** Solicitud de `requester` aprobada con un vehículo nuevo y `driver` al volante. */
  async function approvedTrip(requester: User, driver: Driver, days = 3, hour = 8) {
    const requesterToken = await tokenOf(requester);
    const created = await request(app.getHttpServer())
      .post(`${api}/reservations`)
      .set(auth(requesterToken))
      .send({
        projectId: project.id,
        purpose: 'Taller de liderazgo juvenil',
        destination: 'Comunidad El Rosario',
        passengers: 3,
        proposedDriverId: driver.id,
        ...window(days, hour),
      })
      .expect(201);
    const vehicle = await createVehicle(dataSource);
    await request(app.getHttpServer())
      .post(`${api}/reservations/${created.body.id}/approve`)
      .set(auth(adminToken))
      .send({ resourceId: vehicle.id })
      .expect(200);
    return created.body as { id: string; code: string };
  }

  /** Mueve un viaje ya aprobado a otro horario, como si se hubiera pedido antes. */
  async function moveTo(reservationId: string, startsAt: Date, endsAt: Date) {
    await dataSource.query(
      `UPDATE reservation_request SET starts_at = $2, ends_at = $3 WHERE id = $1`,
      [reservationId, startsAt, endsAt],
    );
    await dataSource.query(
      `UPDATE reservation_assignment SET period = tstzrange($2, $3, '[)')
        WHERE request_id = $1 AND active`,
      [reservationId, startsAt, endsAt],
    );
  }

  const mine = (token: string) =>
    request(app.getHttpServer()).get(`${api}/trips/mine`).set(auth(token)).expect(200);
  const codes = (response: request.Response) =>
    response.body.map((trip: { code: string }) => trip.code);

  it('un técnico que conduce ve el viaje; quien lo pidió y no conduce, no', async () => {
    const ana = await driverOf(UserRole.REQUESTER, { phone: '8888-0001' });
    const luis = await driverOf(UserRole.REQUESTER);
    const trip = await approvedTrip(ana.user, luis.driver);

    const luisTrips = await mine(luis.token);
    expect(codes(luisTrips)).toEqual([trip.code]);
    expect(luisTrips.body[0]).toMatchObject({
      reservationId: trip.id,
      state: 'UPCOMING',
      destination: 'Comunidad El Rosario',
      passengers: 3,
      requester: { fullName: ana.user.fullName, phone: '8888-0001' },
      project: { code: project.code },
      log: null,
    });
    expect(luisTrips.body[0].vehicle.identifier).toEqual(expect.any(String));

    expect(codes(await mine(ana.token))).toEqual([]);
  });

  it.each([UserRole.ADMIN, UserRole.DRIVER])(
    'también ve sus viajes quien tiene rol %s',
    async (role) => {
      const requester = (await driverOf(UserRole.REQUESTER)).user;
      const person = await driverOf(role);
      const trip = await approvedTrip(requester, person.driver);
      expect(codes(await mine(person.token))).toEqual([trip.code]);
    },
  );

  it('los de hoy y los próximos, del más cercano al más lejano; los de ayer no', async () => {
    const luis = await driverOf(UserRole.REQUESTER);
    const requester = (await driverOf(UserRole.REQUESTER)).user;
    const later = await approvedTrip(requester, luis.driver, 5);
    const sooner = await approvedTrip(requester, luis.driver, 2);
    const earlierToday = await approvedTrip(requester, luis.driver, 7);
    const yesterday = await approvedTrip(requester, luis.driver, 9);

    // Uno de hoy que ya terminó su horario sigue en la lista: es de hoy.
    const startOfToday = new Date(
      `${new Date(Date.now() - 6 * 3_600_000).toISOString().slice(0, 10)}T00:00:00-06:00`,
    );
    await moveTo(
      earlierToday.id,
      new Date(startOfToday.getTime() + 60_000),
      new Date(startOfToday.getTime() + 120_000),
    );
    await moveTo(
      yesterday.id,
      new Date(startOfToday.getTime() - 5 * 3_600_000),
      new Date(startOfToday.getTime() - 3_600_000),
    );

    expect(codes(await mine(luis.token))).toEqual([earlierToday.code, sooner.code, later.code]);
  });

  it('un viaje en curso aparece aunque haya pasado su hora de regreso', async () => {
    const luis = await driverOf(UserRole.REQUESTER);
    const requester = (await driverOf(UserRole.REQUESTER)).user;
    const trip = await approvedTrip(requester, luis.driver, 11);
    const twoDaysAgo = Date.now() - 2 * 86_400_000;
    await moveTo(trip.id, new Date(twoDaysAgo), new Date(twoDaysAgo + 3_600_000));
    await dataSource.query(
      `INSERT INTO trip_log (assignment_id, started_at, start_odometer, start_fuel_level)
       SELECT id, $2, 1000, 80 FROM reservation_assignment WHERE request_id = $1 AND active`,
      [trip.id, new Date(twoDaysAgo)],
    );

    const trips = await mine(luis.token);
    expect(codes(trips)).toEqual([trip.code]);
    expect(trips.body[0]).toMatchObject({ state: 'IN_PROGRESS', log: { finishedAt: null } });
  });

  it('una solicitud cancelada o un viaje reasignado a otra persona sale de la lista', async () => {
    const luis = await driverOf(UserRole.REQUESTER);
    const marta = await driverOf(UserRole.REQUESTER);
    const requester = (await driverOf(UserRole.REQUESTER)).user;
    const cancelled = await approvedTrip(requester, luis.driver, 13);
    const reassigned = await approvedTrip(requester, luis.driver, 15);

    await request(app.getHttpServer())
      .post(`${api}/reservations/${cancelled.id}/cancel`)
      .set(auth(adminToken))
      .expect(200);
    await request(app.getHttpServer())
      .post(`${api}/reservations/${reassigned.id}/reassign`)
      .set(auth(adminToken))
      .send({ driverId: marta.driver.id })
      .expect(200);

    expect(codes(await mine(luis.token))).toEqual([]);
    expect(codes(await mine(marta.token))).toEqual([reassigned.code]);
  });

  it('el viaje se sigue viendo aunque la licencia venza después de asignarlo', async () => {
    const luis = await driverOf(UserRole.REQUESTER);
    const requester = (await driverOf(UserRole.REQUESTER)).user;
    const trip = await approvedTrip(requester, luis.driver, 17);
    await dataSource.query(`UPDATE driver SET license_expiry = '2020-01-01' WHERE id = $1`, [
      luis.driver.id,
    ]);
    expect(codes(await mine(luis.token))).toEqual([trip.code]);
  });

  describe('un viaje por su solicitud', () => {
    it('quien conduce lo abre; quien no, recibe 404 aunque lo haya pedido', async () => {
      const ana = await driverOf(UserRole.REQUESTER);
      const luis = await driverOf(UserRole.REQUESTER);
      const trip = await approvedTrip(ana.user, luis.driver, 19);

      const own = await request(app.getHttpServer())
        .get(`${api}/trips/mine/${trip.id}`)
        .set(auth(luis.token))
        .expect(200);
      expect(own.body.code).toBe(trip.code);

      const notMine = await request(app.getHttpServer())
        .get(`${api}/trips/mine/${trip.id}`)
        .set(auth(ana.token))
        .expect(404);
      expect(notMine.body.message).toBe('No tienes asignado ese viaje.');
    });

    it('sin sesión responde 401 y con un id que no es uuid, 400', async () => {
      await request(app.getHttpServer()).get(`${api}/trips/mine`).expect(401);
      const luis = await driverOf(UserRole.REQUESTER);
      await request(app.getHttpServer())
        .get(`${api}/trips/mine/no-es-un-uuid`)
        .set(auth(luis.token))
        .expect(400);
    });
  });

  describe('avisos para quien conduce', () => {
    const noticesAbout = async (userId: string, reservationId: string) =>
      (await dataSource.getRepository(Notification).findBy({ userId }))
        .filter((n) => n.data?.reservationId === reservationId)
        .map((n) => ({ title: n.title, audience: n.data?.audience ?? null }));

    it('el aviso de asignación lleva al viaje y el de quien deja de conducir, a la bandeja', async () => {
      const ana = await driverOf(UserRole.REQUESTER);
      const luis = await driverOf(UserRole.REQUESTER);
      const marta = await driverOf(UserRole.REQUESTER);
      const trip = await approvedTrip(ana.user, luis.driver, 21);
      await request(app.getHttpServer())
        .post(`${api}/reservations/${trip.id}/reassign`)
        .set(auth(adminToken))
        .send({ driverId: marta.driver.id })
        .expect(200);

      expect(await noticesAbout(luis.user.id, trip.id)).toEqual(
        expect.arrayContaining([
          { title: `Tienes un viaje asignado: ${trip.code}`, audience: 'DRIVER' },
          { title: `Ya no conduces el viaje ${trip.code}`, audience: 'FORMER_DRIVER' },
        ]),
      );
      expect(await noticesAbout(marta.user.id, trip.id)).toEqual([
        { title: `Tienes un viaje asignado: ${trip.code}`, audience: 'DRIVER' },
      ]);
      // A quien pidió no se le marca: abre su solicitud.
      expect((await noticesAbout(ana.user.id, trip.id)).every((n) => n.audience === null)).toBe(
        true,
      );
    });
  });
});
