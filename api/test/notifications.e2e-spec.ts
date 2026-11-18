import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import { SessionService } from '#modules/auth/session.service.js';
import { Notification } from '#modules/notifications/entities/notification.entity.js';
import { UserDevice } from '#modules/notifications/entities/user-device.entity.js';
import { EXPO_PUSH_URL } from '#modules/notifications/expo-push.js';
import {
  PUSH_MAX_ATTEMPTS,
  PushDispatcher,
} from '#modules/notifications/push-dispatcher.service.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { createE2eContext, destroyE2eContext, runMigrations, unique } from './e2e-context.js';
import { createDriver, createProject, createUser, PASSWORD } from './fixtures.js';

/** Bandeja de avisos, teléfonos registrados y envío push (HU-19, RF-19, RF-20). */
describe('Notificaciones (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const api = '/api/v1';

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const token = (tag: string) => `ExponentPushToken[${unique(tag, 30)}]`;

  /** Persona con sesión y, si se pide, un aviso sin leer. */
  async function person(role = UserRole.REQUESTER) {
    const user = await createUser(dataSource, role);
    // Con el servicio y no por HTTP: el login tiene un límite de 10 por minuto.
    const session = await app
      .get(SessionService)
      .start({ email: user.email, password: PASSWORD }, 'mobile');
    return { user, access: session.accessToken };
  }
  const notify = (user: User, overrides: Partial<Notification> = {}) =>
    dataSource.getRepository(Notification).save(
      dataSource.getRepository(Notification).create({
        userId: user.id,
        title: 'Solicitud SOL-2026-00001 aprobada',
        body: 'Tu viaje a El Rosario',
        data: {
          kind: 'RESERVATION_APPROVED',
          reservationId: '0b9c7f0e-6d2a-4c3e-9a51-6f7e2b1d0001',
        },
        ...overrides,
      }),
    );
  const registerDevice = (access: string, deviceToken: string) =>
    request(app.getHttpServer())
      .put(`${api}/notifications/devices`)
      .set(auth(access))
      .send({ token: deviceToken, platform: 'android' });
  const devicesOf = (user: User) =>
    dataSource.getRepository(UserDevice).findBy({ userId: user.id });
  const reload = (id: string) => dataSource.getRepository(Notification).findOneByOrFail({ id });

  describe('bandeja (RF-19)', () => {
    it('cada persona ve solo sus avisos, del más reciente al más antiguo', async () => {
      const ana = await person();
      const luis = await person();
      const first = await notify(ana.user, { title: 'Primero' });
      await dataSource.query(
        `UPDATE notification SET created_at = now() - interval '1 hour' WHERE id = $1`,
        [first.id],
      );
      await notify(ana.user, { title: 'Segundo' });
      await notify(luis.user, { title: 'De Luis' });

      const list = await request(app.getHttpServer())
        .get(`${api}/notifications`)
        .set(auth(ana.access))
        .expect(200);
      expect(list.body.total).toBe(2);
      expect(list.body.data.map((n: { title: string }) => n.title)).toEqual(['Segundo', 'Primero']);
      // Sin los datos internos del envío.
      expect(list.body.data[0]).not.toHaveProperty('pushStatus');
      expect(list.body.data[0].data.reservationId).toBeDefined();
    });

    it('cuenta las no leídas, marca una y luego todas', async () => {
      const ana = await person();
      const one = await notify(ana.user);
      await notify(ana.user);
      await notify(ana.user);
      const count = () =>
        request(app.getHttpServer())
          .get(`${api}/notifications/unread-count`)
          .set(auth(ana.access))
          .expect(200)
          .then((r) => r.body.count);

      expect(await count()).toBe(3);
      const read = await request(app.getHttpServer())
        .post(`${api}/notifications/${one.id}/read`)
        .set(auth(ana.access))
        .expect(200);
      expect(read.body.readAt).toEqual(expect.any(String));
      // Marcarla otra vez no cambia la hora de lectura.
      const again = await request(app.getHttpServer())
        .post(`${api}/notifications/${one.id}/read`)
        .set(auth(ana.access))
        .expect(200);
      expect(again.body.readAt).toBe(read.body.readAt);
      expect(await count()).toBe(2);

      const unread = await request(app.getHttpServer())
        .get(`${api}/notifications?unread=true`)
        .set(auth(ana.access))
        .expect(200);
      expect(unread.body.total).toBe(2);

      const all = await request(app.getHttpServer())
        .post(`${api}/notifications/read-all`)
        .set(auth(ana.access))
        .expect(200);
      expect(all.body.updated).toBe(2);
      expect(await count()).toBe(0);
    });

    it('el aviso de otra persona responde 404 y no se marca', async () => {
      const ana = await person();
      const luis = await person();
      const luisNotice = await notify(luis.user);
      await request(app.getHttpServer())
        .post(`${api}/notifications/${luisNotice.id}/read`)
        .set(auth(ana.access))
        .expect(404);
      expect((await reload(luisNotice.id)).readAt).toBeNull();
    });

    it('la coordinación y quien conduce también tienen bandeja; sin sesión, 401', async () => {
      for (const role of [UserRole.ADMIN, UserRole.DRIVER]) {
        const { access } = await person(role);
        await request(app.getHttpServer())
          .get(`${api}/notifications`)
          .set(auth(access))
          .expect(200);
      }
      await request(app.getHttpServer()).get(`${api}/notifications`).expect(401);
    });

    it('una solicitud nueva deja el aviso en la bandeja de la coordinación', async () => {
      const admin = await person(UserRole.ADMIN);
      const tech = await person();
      // Conduce quien pide (RN-15): necesita licencia registrada.
      await createDriver(dataSource, '2035-12-31', tech.user);
      const project = await createProject(dataSource);
      const start = new Date(Date.now() + 3 * 86_400_000);
      await request(app.getHttpServer())
        .post(`${api}/reservations`)
        .set(auth(tech.access))
        .send({
          projectId: project.id,
          purpose: 'Taller de liderazgo',
          destination: 'El Rosario',
          passengers: 2,
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
        })
        .expect(201);
      const inbox = await request(app.getHttpServer())
        .get(`${api}/notifications?unread=true`)
        .set(auth(admin.access))
        .expect(200);
      expect(inbox.body.data[0].title).toMatch(/^Nueva solicitud SOL-/);
    });
  });

  describe('teléfonos (RF-20)', () => {
    it('registra el teléfono; repetirlo no lo duplica', async () => {
      const ana = await person();
      const phone = token('ana');
      await registerDevice(ana.access, phone).expect(204);
      await registerDevice(ana.access, phone).expect(204);
      const devices = await devicesOf(ana.user);
      expect(devices.map((d) => d.expoPushToken)).toEqual([phone]);
    });

    it('si otra persona entra en ese teléfono, el registro pasa a ella', async () => {
      const ana = await person();
      const luis = await person();
      const phone = token('shared');
      await registerDevice(ana.access, phone).expect(204);
      await registerDevice(luis.access, phone).expect(204);
      expect(await devicesOf(ana.user)).toHaveLength(0);
      expect((await devicesOf(luis.user)).map((d) => d.expoPushToken)).toEqual([phone]);
    });

    it('rechaza un token que no es de Expo', async () => {
      const ana = await person();
      await registerDevice(ana.access, 'https://evil.example/hook').expect(400);
      await request(app.getHttpServer())
        .put(`${api}/notifications/devices`)
        .set(auth(ana.access))
        .send({ token: token('x'), platform: 'windows' })
        .expect(400);
    });

    it('solo el dueño quita su teléfono', async () => {
      const ana = await person();
      const luis = await person();
      const phone = token('own');
      await registerDevice(ana.access, phone).expect(204);
      await request(app.getHttpServer())
        .post(`${api}/notifications/devices/remove`)
        .set(auth(luis.access))
        .send({ token: phone })
        .expect(204);
      expect(await devicesOf(ana.user)).toHaveLength(1);
      await request(app.getHttpServer())
        .post(`${api}/notifications/devices/remove`)
        .set(auth(ana.access))
        .send({ token: phone })
        .expect(204);
      expect(await devicesOf(ana.user)).toHaveLength(0);
    });

    it('cerrar la sesión de la app con el token del teléfono deja de avisarle', async () => {
      const ana = await person();
      const phone = token('logout');
      await registerDevice(ana.access, phone).expect(204);
      const session = await app
        .get(SessionService)
        .start({ email: ana.user.email, password: PASSWORD }, 'mobile');
      await request(app.getHttpServer())
        .post(`${api}/auth/mobile-session/logout`)
        .send({ refreshToken: session.refreshToken, pushToken: phone })
        .expect(204);
      expect(await devicesOf(ana.user)).toHaveLength(0);
    });

    it('con el refresh token de una persona no se quita el teléfono de otra', async () => {
      const ana = await person();
      const luis = await person();
      const phone = token('other');
      await registerDevice(luis.access, phone).expect(204);
      const session = await app
        .get(SessionService)
        .start({ email: ana.user.email, password: PASSWORD }, 'mobile');
      await request(app.getHttpServer())
        .post(`${api}/auth/mobile-session/logout`)
        .send({ refreshToken: session.refreshToken, pushToken: phone })
        .expect(204);
      expect(await devicesOf(luis.user)).toHaveLength(1);
    });

    it('cerrar las sesiones de alguien desde el panel también olvida sus teléfonos (HU-29)', async () => {
      const admin = await person(UserRole.ADMIN);
      const lost = await person();
      await registerDevice(lost.access, token('lost')).expect(204);
      await request(app.getHttpServer())
        .post(`${api}/users/${lost.user.id}/sessions/revoke`)
        .set(auth(admin.access))
        .expect(200);
      expect(await devicesOf(lost.user)).toHaveLength(0);
    });
  });

  describe('envío push (RF-20)', () => {
    /**
     * Expo de mentira: responde un ticket por mensaje según el token. `gone` simula una
     * app desinstalada; `fail`, un error pasajero. Guarda lo que recibe.
     */
    function fakeExpo() {
      const sent: { to: string; title: string; data: Record<string, unknown> }[] = [];
      const fetchImpl = (async (url: string, init: { body: string }) => {
        expect(url).toBe(EXPO_PUSH_URL);
        const messages = JSON.parse(init.body) as typeof sent;
        sent.push(...messages);
        return {
          ok: true,
          json: async () => ({
            data: messages.map((m) =>
              m.to.includes('gone')
                ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
                : m.to.includes('fail')
                  ? { status: 'error', details: { error: 'MessageRateExceeded' } }
                  : { status: 'ok', id: 'ticket' },
            ),
          }),
        };
      }) as unknown as typeof fetch;
      return { sent, fetchImpl };
    }
    const dispatch = (fetchImpl: typeof fetch) => app.get(PushDispatcher).dispatch(fetchImpl);

    it('envía el aviso a todos los teléfonos de la persona y lo marca enviado', async () => {
      const ana = await person();
      const [phone, tablet] = [token('p1'), token('p2')];
      await registerDevice(ana.access, phone).expect(204);
      await registerDevice(ana.access, tablet).expect(204);
      const notice = await notify(ana.user);

      const expo = fakeExpo();
      await dispatch(expo.fetchImpl);

      const mine = expo.sent.filter((m) => m.data.notificationId === notice.id);
      expect(mine.map((m) => m.to).sort()).toEqual([phone, tablet].sort());
      expect(mine[0]).toMatchObject({
        title: notice.title,
        data: { reservationId: notice.data?.reservationId, notificationId: notice.id },
      });
      expect((await reload(notice.id)).pushStatus).toBe('SENT');

      // La siguiente vuelta no lo repite.
      const second = fakeExpo();
      await dispatch(second.fetchImpl);
      expect(second.sent.filter((m) => m.data.notificationId === notice.id)).toHaveLength(0);
    });

    it('sin teléfonos registrados no se envía: queda solo en la bandeja', async () => {
      const ana = await person();
      const notice = await notify(ana.user);
      const expo = fakeExpo();
      await dispatch(expo.fetchImpl);
      expect(expo.sent.filter((m) => m.data.notificationId === notice.id)).toHaveLength(0);
      expect((await reload(notice.id)).pushStatus).toBe('SKIPPED');
    });

    it('olvida el teléfono donde desinstalaron la app', async () => {
      const ana = await person();
      await registerDevice(ana.access, token('gone')).expect(204);
      const notice = await notify(ana.user);
      await dispatch(fakeExpo().fetchImpl);
      expect(await devicesOf(ana.user)).toHaveLength(0);
      expect((await reload(notice.id)).pushStatus).toBe('SKIPPED');
    });

    it(`reintenta un error pasajero y se rinde tras ${PUSH_MAX_ATTEMPTS} intentos`, async () => {
      const ana = await person();
      await registerDevice(ana.access, token('fail')).expect(204);
      const notice = await notify(ana.user);
      for (let i = 1; i <= PUSH_MAX_ATTEMPTS; i++) {
        await dispatch(fakeExpo().fetchImpl);
        const current = await reload(notice.id);
        expect(current.pushAttempts).toBe(i);
        expect(current.pushStatus).toBe(i < PUSH_MAX_ATTEMPTS ? 'PENDING' : 'FAILED');
      }
      // Sigue en la bandeja aunque el push falló.
      expect((await reload(notice.id)).readAt).toBeNull();
    });

    it('no envía avisos viejos ni a cuentas desactivadas', async () => {
      const ana = await person();
      await registerDevice(ana.access, token('old')).expect(204);
      const old = await notify(ana.user);
      await dataSource.query(
        `UPDATE notification SET created_at = now() - interval '2 hours' WHERE id = $1`,
        [old.id],
      );
      const off = await person();
      await registerDevice(off.access, token('off')).expect(204);
      const offNotice = await notify(off.user);
      await dataSource.query(`UPDATE "user" SET is_active = false WHERE id = $1`, [off.user.id]);

      const expo = fakeExpo();
      await dispatch(expo.fetchImpl);

      expect(expo.sent.filter((m) => m.data.notificationId === old.id)).toHaveLength(0);
      expect((await reload(old.id)).pushStatus).toBe('SKIPPED');
      expect(expo.sent.filter((m) => m.data.notificationId === offNotice.id)).toHaveLength(0);
    });

    it('si Expo no responde, el aviso queda pendiente para la siguiente vuelta', async () => {
      const ana = await person();
      await registerDevice(ana.access, token('down')).expect(204);
      const notice = await notify(ana.user);
      await dispatch((async () => {
        throw new TypeError('fetch failed');
      }) as unknown as typeof fetch);
      expect(await reload(notice.id)).toMatchObject({ pushStatus: 'PENDING', pushAttempts: 1 });
      await dispatch(fakeExpo().fetchImpl);
      expect((await reload(notice.id)).pushStatus).toBe('SENT');
    });
  });
});
