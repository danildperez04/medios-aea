import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import type { User } from '#modules/users/entities/user.entity.js';
import {
  MOBILE_REUSE_GRACE_MS,
  REUSE_GRACE_MS,
  SessionService,
  type SessionResult,
} from '#modules/auth/session.service.js';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';
import { createUser, PASSWORD } from './fixtures.js';

/**
 * Sesión de la app móvil (HU-28) y cierre de sesiones al cambiar la contraseña
 * (ADR 0003): refresh token en el cuerpo, rotación, 7 días sin uso y revocación.
 */
describe('Sesion de la app movil (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const api = '/api/v1';
  const base = `${api}/auth/mobile-session`;

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  /** Abre la sesión con el servicio: no consume el límite de 10 inicios por minuto. */
  const open = (user: User, client: 'web' | 'mobile' = 'mobile'): Promise<SessionResult> =>
    app.get(SessionService).start({ email: user.email, password: PASSWORD }, client);

  const refresh = (refreshToken: unknown) =>
    request(app.getHttpServer()).post(`${base}/refresh`).send({ refreshToken });
  const me = (accessToken: string) =>
    request(app.getHttpServer())
      .get(`${api}/auth/me`)
      .set('Authorization', `Bearer ${accessToken}`);
  /** Simula que pasaron `seconds` desde que se rotaron los tokens ya usados. */
  const ageUsedTokens = (userId: string, seconds: number) =>
    dataSource.query(
      `UPDATE refresh_token SET used_at = now() - make_interval(secs => $2)
        WHERE user_id = $1 AND used_at IS NOT NULL`,
      [userId, seconds],
    );

  it('inicia sesion: token de acceso corto y refresh token en el cuerpo, sin cookie', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const before = Date.now();
    const response = await request(app.getHttpServer())
      .post(base)
      .send({ email: user.email, password: PASSWORD })
      .expect(200);

    expect(response.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 15 * 60 });
    expect(response.body.user).toMatchObject({ id: user.id, role: 'REQUESTER' });
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie']).toBeUndefined();

    // La sesión vence a los 7 días sin uso.
    const days = (new Date(response.body.refreshExpiresAt).getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThan(7.01);

    await me(response.body.accessToken).expect(200);
  });

  it.each([UserRole.ADMIN, UserRole.DRIVER])('admite el rol %s (RN-16)', async (role) => {
    const user = await createUser(dataSource, role);
    const session = await open(user);
    const response = await me(session.accessToken).expect(200);
    expect(response.body.role).toBe(role);
  });

  it('la base guarda solo el hash y marca la sesion como de la app', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const session = await open(user);
    const rows = await dataSource.query<{ token_hash: string; client: string }[]>(
      `SELECT token_hash, client FROM refresh_token WHERE user_id = $1`,
      [user.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].client).toBe('mobile');
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].token_hash).not.toBe(session.refreshToken);
  });

  it('renovar rota el refresh token y vuelve a dar 7 dias', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const session = await open(user);
    // Quedaba un día de sesión: usarla la extiende.
    await dataSource.query(
      `UPDATE refresh_token SET expires_at = now() + interval '1 day' WHERE user_id = $1`,
      [user.id],
    );
    const response = await refresh(session.refreshToken).expect(200);
    expect(response.body.refreshToken).not.toBe(session.refreshToken);
    const days = (new Date(response.body.refreshExpiresAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    await me(response.body.accessToken).expect(200);
    await refresh(response.body.refreshToken).expect(200);
  });

  it('tras 7 dias sin uso la sesion vence', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const session = await open(user);
    await dataSource.query(
      `UPDATE refresh_token SET expires_at = now() - interval '1 minute' WHERE user_id = $1`,
      [user.id],
    );
    await refresh(session.refreshToken).expect(401);
  });

  it('sin token, con uno mal formado o con uno inventado no renueva', async () => {
    await refresh(undefined).expect(400);
    await refresh('corto').expect(400);
    await refresh('x'.repeat(43)).expect(401);
  });

  it('con mala senal, reintentar con el token recien rotado no cierra la sesion', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const session = await open(user);
    await refresh(session.refreshToken).expect(200); // la respuesta "se pierde"
    // Pasó más que el margen del panel, pero menos que el de la app.
    await ageUsedTokens(user.id, REUSE_GRACE_MS / 1000 + 30);
    const retry = await refresh(session.refreshToken).expect(200);
    await refresh(retry.body.refreshToken).expect(200);
  });

  it('un token ya usado que vuelve fuera del margen revoca toda la sesion', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const session = await open(user);
    const rotated = await refresh(session.refreshToken).expect(200);
    await ageUsedTokens(user.id, MOBILE_REUSE_GRACE_MS / 1000 + 5);

    const stolen = await refresh(session.refreshToken).expect(401);
    expect(stolen.body.message).toMatch(/por seguridad/);
    // El token vigente de la persona también quedó revocado.
    await refresh(rotated.body.refreshToken).expect(401);
  });

  it('cerrar sesion revoca el refresh token en el servidor', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const session = await open(user);
    await request(app.getHttpServer())
      .post(`${base}/logout`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);
    await refresh(session.refreshToken).expect(401);
    // Repetirlo (la app reintenta sin saber si llegó) no es un error.
    await request(app.getHttpServer())
      .post(`${base}/logout`)
      .send({ refreshToken: session.refreshToken })
      .expect(204);
  });

  it('una cuenta desactivada no puede renovar', async () => {
    const user = await createUser(dataSource, UserRole.DRIVER);
    const session = await open(user);
    await dataSource.query(`UPDATE "user" SET is_active = false WHERE id = $1`, [user.id]);
    const response = await refresh(session.refreshToken).expect(401);
    expect(response.body.message).toMatch(/desactivada/);
  });

  describe('un token solo sirve en las rutas de su cliente', () => {
    it('el refresh token de la app no renueva la sesion del panel', async () => {
      const admin = await createUser(dataSource, UserRole.ADMIN);
      const session = await open(admin, 'mobile');
      await request(app.getHttpServer())
        .post(`${api}/auth/session/refresh`)
        .set('X-Medios-Client', 'web')
        .set('Cookie', `medios_aea_refresh=${encodeURIComponent(session.refreshToken)}`)
        .expect(401);
      // Y el intento no le cerró la sesión de la app.
      await refresh(session.refreshToken).expect(200);
    });

    it('el refresh token del panel no renueva ni cierra desde las rutas de la app', async () => {
      const admin = await createUser(dataSource, UserRole.ADMIN);
      const session = await open(admin, 'web');
      await refresh(session.refreshToken).expect(401);
      await request(app.getHttpServer())
        .post(`${base}/logout`)
        .send({ refreshToken: session.refreshToken })
        .expect(204);
      await request(app.getHttpServer())
        .post(`${api}/auth/session/refresh`)
        .set('X-Medios-Client', 'web')
        .set('Cookie', `medios_aea_refresh=${encodeURIComponent(session.refreshToken)}`)
        .expect(200);
    });
  });

  describe('cambiar o restablecer la contrasena cierra las sesiones', () => {
    const NEW_PASSWORD = 'OtraClave6789';

    it('quien cambia su contrasena queda fuera en todos sus dispositivos', async () => {
      const user = await createUser(dataSource, UserRole.ADMIN);
      const phone = await open(user, 'mobile');
      const panel = await open(user, 'web');

      await request(app.getHttpServer())
        .patch(`${api}/auth/password`)
        .set('Authorization', `Bearer ${panel.accessToken}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(200);

      // Los tokens de acceso ya emitidos dejan de valer de inmediato, no al vencer.
      const rejected = await me(phone.accessToken).expect(401);
      expect(rejected.body.message).toMatch(/Tu sesión se cerró/);
      await me(panel.accessToken).expect(401);
      // Y ninguno de los dos puede renovar.
      await refresh(phone.refreshToken).expect(401);
      await request(app.getHttpServer())
        .post(`${api}/auth/session/refresh`)
        .set('X-Medios-Client', 'web')
        .set('Cookie', `medios_aea_refresh=${encodeURIComponent(panel.refreshToken)}`)
        .expect(401);

      // Con la contraseña nueva entra otra vez.
      const again = await app
        .get(SessionService)
        .start({ email: user.email, password: NEW_PASSWORD }, 'mobile');
      await me(again.accessToken).expect(200);
    });

    it('si la contrasena actual no es correcta, las sesiones siguen abiertas', async () => {
      const user = await createUser(dataSource, UserRole.REQUESTER);
      const session = await open(user);
      await request(app.getHttpServer())
        .patch(`${api}/auth/password`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: 'NoEsLaMia123', newPassword: NEW_PASSWORD })
        .expect(400);
      await me(session.accessToken).expect(200);
      await refresh(session.refreshToken).expect(200);
    });

    it('si la coordinacion restablece la contrasena, la persona queda fuera', async () => {
      const admin = await createUser(dataSource, UserRole.ADMIN);
      const adminSession = await open(admin, 'web');
      const driver = await createUser(dataSource, UserRole.DRIVER);
      const phone = await open(driver);

      await request(app.getHttpServer())
        .patch(`${api}/users/${driver.id}/password`)
        .set('Authorization', `Bearer ${adminSession.accessToken}`)
        .send({ password: NEW_PASSWORD })
        .expect(200);

      await me(phone.accessToken).expect(401);
      await refresh(phone.refreshToken).expect(401);
      // La sesión de quien hizo el cambio no se toca.
      await me(adminSession.accessToken).expect(200);
    });

    it('el token sin renovacion de /auth/login tambien deja de valer', async () => {
      const user = await createUser(dataSource, UserRole.REQUESTER);
      const login = await request(app.getHttpServer())
        .post(`${api}/auth/login`)
        .send({ email: user.email, password: PASSWORD })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`${api}/auth/password`)
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(200);
      await me(login.body.accessToken).expect(401);
    });
  });

  describe('la coordinacion cierra las sesiones de una persona (HU-29)', () => {
    const revoke = (userId: string, accessToken: string) =>
      request(app.getHttpServer())
        .post(`${api}/users/${userId}/sessions/revoke`)
        .set('Authorization', `Bearer ${accessToken}`);
    const panelRefresh = (refreshToken: string) =>
      request(app.getHttpServer())
        .post(`${api}/auth/session/refresh`)
        .set('X-Medios-Client', 'web')
        .set('Cookie', `medios_aea_refresh=${encodeURIComponent(refreshToken)}`);

    it('cierra la app y el panel de esa persona de inmediato, sin desactivarla', async () => {
      const admin = await createUser(dataSource, UserRole.ADMIN);
      const adminSession = await open(admin, 'web');
      const other = await createUser(dataSource, UserRole.ADMIN);
      const phone = await open(other, 'mobile');
      const panel = await open(other, 'web');

      const response = await revoke(other.id, adminSession.accessToken).expect(200);
      expect(response.body.message).toBe(`Se cerraron las sesiones de ${other.fullName}.`);

      // Los tokens de acceso ya emitidos dejan de servir y ninguno puede renovar.
      await me(phone.accessToken).expect(401);
      await me(panel.accessToken).expect(401);
      await refresh(phone.refreshToken).expect(401);
      await panelRefresh(panel.refreshToken).expect(401);

      // La cuenta sigue activa: vuelve a entrar con su contraseña.
      const rows = await dataSource.query<{ is_active: boolean }[]>(
        `SELECT is_active FROM "user" WHERE id = $1`,
        [other.id],
      );
      expect(rows[0].is_active).toBe(true);
      const again = await open(other, 'mobile');
      await me(again.accessToken).expect(200);
      await refresh(again.refreshToken).expect(200);

      // Las sesiones de quien lo hizo no se tocan.
      await me(adminSession.accessToken).expect(200);
    });

    it('queda en la auditoria quien cerro las sesiones de quien y cuando', async () => {
      const admin = await createUser(dataSource, UserRole.ADMIN);
      const adminSession = await open(admin, 'web');
      const driver = await createUser(dataSource, UserRole.DRIVER);
      const before = Date.now();

      await revoke(driver.id, adminSession.accessToken).expect(200);

      const rows = await dataSource.query<
        { actor_id: string; action: string; entity: string; created_at: Date }[]
      >(`SELECT actor_id, action, entity, created_at FROM audit_log WHERE entity_id = $1`, [
        driver.id,
      ]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actor_id: admin.id,
        action: 'REVOKE_SESSIONS',
        entity: 'user',
      });
      expect(new Date(rows[0].created_at).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it.each([UserRole.REQUESTER, UserRole.DRIVER])(
      'un %s no puede cerrar las sesiones de nadie (403)',
      async (role) => {
        const actor = await createUser(dataSource, role);
        const actorSession = await open(actor);
        const victim = await createUser(dataSource, UserRole.REQUESTER);
        const victimSession = await open(victim);

        await revoke(victim.id, actorSession.accessToken).expect(403);
        // Ni las ajenas ni las propias por esta ruta.
        await revoke(actor.id, actorSession.accessToken).expect(403);

        await me(victimSession.accessToken).expect(200);
        await refresh(victimSession.refreshToken).expect(200);
      },
    );

    it('sin sesion responde 401 y con un usuario que no existe, 404', async () => {
      const admin = await createUser(dataSource, UserRole.ADMIN);
      const adminSession = await open(admin, 'web');
      await request(app.getHttpServer())
        .post(`${api}/users/${admin.id}/sessions/revoke`)
        .expect(401);
      await revoke('0b9c7f0e-6d2a-4c3e-9a51-6f7e2b1d9999', adminSession.accessToken).expect(404);
      await revoke('no-es-un-uuid', adminSession.accessToken).expect(400);
    });

    it('si la persona no tenia sesiones abiertas, tambien responde bien y queda registrado', async () => {
      const admin = await createUser(dataSource, UserRole.ADMIN);
      const adminSession = await open(admin, 'web');
      const idle = await createUser(dataSource, UserRole.REQUESTER);
      await revoke(idle.id, adminSession.accessToken).expect(200);
      const rows = await dataSource.query<{ n: string }[]>(
        `SELECT count(*) AS n FROM audit_log WHERE entity_id = $1`,
        [idle.id],
      );
      expect(Number(rows[0].n)).toBe(1);
    });
  });
});
