import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { UserRole } from '#common/enums/domain.enums.js';
import type { User } from '#modules/users/entities/user.entity.js';
import { durationSeconds } from '#modules/auth/auth.service.js';
import { REUSE_GRACE_MS, SessionService } from '#modules/auth/session.service.js';
import { createE2eContext, destroyE2eContext, runMigrations } from './e2e-context.js';
import { createUser, PASSWORD } from './fixtures.js';

/**
 * Sesión del panel web (ADR 0003): token de acceso en el cuerpo, refresh token en una
 * cookie HttpOnly que rota en cada uso, detección de reutilización y cierre de sesión.
 */
describe('Sesion del panel (integracion)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const api = '/api/v1';
  const web = { 'X-Medios-Client': 'web' };

  beforeAll(async () => {
    const context = await createE2eContext();
    app = context.app;
    dataSource = context.dataSource;
    await runMigrations(dataSource);
  }, 60_000);

  afterAll(async () => {
    if (app) await destroyE2eContext({ app, dataSource, moduleRef: null as never });
  });

  /** Valor de la cookie de refresh en una respuesta, o undefined. */
  const refreshCookie = (response: request.Response): string | undefined => {
    const raw = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
    return raw.find((c) => c.startsWith('medios_aea_refresh='));
  };
  const valueOf = (cookie: string | undefined) => cookie?.split(';')[0];

  /**
   * Abre la sesión con el servicio, sin pasar por POST /auth/session: así las pruebas
   * no consumen el límite de 10 inicios por minuto. Devuelve la cookie como la mandaría
   * el navegador.
   */
  const session = async (user: User): Promise<string> => {
    const result = await app.get(SessionService).start({ email: user.email, password: PASSWORD });
    return `medios_aea_refresh=${encodeURIComponent(result.refreshToken)}`;
  };

  /** Inicio por HTTP: solo para las pruebas que revisan la respuesta y la cookie. */
  const start = async (user: User) => {
    const response = await request(app.getHttpServer())
      .post(`${api}/auth/session`)
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    return { response, cookie: valueOf(refreshCookie(response)) as string };
  };
  const refresh = (cookie?: string, headers: Record<string, string> = web) => {
    const req = request(app.getHttpServer()).post(`${api}/auth/session/refresh`).set(headers);
    return cookie ? req.set('Cookie', cookie) : req;
  };

  it('inicia sesion: token corto en el cuerpo y cookie HttpOnly, Strict y acotada', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const { response } = await start(user);

    expect(response.body).toMatchObject({ tokenType: 'Bearer', expiresIn: 15 * 60 });
    expect(response.body.user).toMatchObject({ id: user.id, role: 'ADMIN' });
    expect(response.body).not.toHaveProperty('refreshToken');

    const cookie = refreshCookie(response) ?? '';
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth\/session/);

    // El token sirve para la API como el de la app.
    await request(app.getHttpServer())
      .get(`${api}/auth/me`)
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .expect(200);
  });

  it('la base guarda solo el hash del refresh token', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    const raw = decodeURIComponent(cookie.split('=')[1]);
    const rows = await dataSource.query<{ token_hash: string }[]>(
      `SELECT token_hash FROM refresh_token WHERE user_id = $1`,
      [user.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].token_hash).not.toBe(raw);
  });

  it('refrescar rota la cookie y entrega otro token de acceso', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    const response = await refresh(cookie).expect(200);
    const next = valueOf(refreshCookie(response));
    expect(next).toBeDefined();
    expect(next).not.toBe(cookie);
    expect(response.body.user.id).toBe(user.id);
    await refresh(next).expect(200);
  });

  it('sin el encabezado del panel responde 403 (CSRF)', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    await refresh(cookie, {}).expect(403);
    await request(app.getHttpServer())
      .post(`${api}/auth/session/logout`)
      .set('Cookie', cookie)
      .expect(403);
  });

  it('sin cookie o con una inventada responde 401', async () => {
    await refresh().expect(401);
    await refresh('medios_aea_refresh=inventado').expect(401);
  });

  it('dos pestanas que refrescan con el mismo token a la vez no se cierran la sesion', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    const [a, b] = await Promise.all([refresh(cookie), refresh(cookie)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    await refresh(valueOf(refreshCookie(b))).expect(200);
  });

  it('reutilizar un token rotado fuera del margen revoca toda la sesion', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    const rotated = await refresh(cookie).expect(200);
    const current = valueOf(refreshCookie(rotated));

    // Se simula que pasó el margen de gracia desde que se usó el primero.
    await dataSource.query(
      `UPDATE refresh_token SET used_at = now() - make_interval(secs => $2)
        WHERE user_id = $1 AND used_at IS NOT NULL`,
      [user.id, REUSE_GRACE_MS / 1000 + 5],
    );
    const stolen = await refresh(cookie).expect(401);
    expect(stolen.body.message).toMatch(/por seguridad/);
    // El token vigente de la víctima también quedó revocado.
    await refresh(current).expect(401);
  });

  it('cerrar sesion revoca el refresh token y borra la cookie', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    const response = await request(app.getHttpServer())
      .post(`${api}/auth/session/logout`)
      .set(web)
      .set('Cookie', cookie)
      .expect(204);
    expect(refreshCookie(response)).toMatch(/medios_aea_refresh=;/);
    await refresh(cookie).expect(401);
  });

  it('una cuenta desactivada no puede refrescar', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    await dataSource.query(`UPDATE "user" SET is_active = false WHERE id = $1`, [user.id]);
    const response = await refresh(cookie).expect(401);
    expect(response.body.message).toMatch(/desactivada/);
  });

  it('un refresh token vencido responde 401', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    await dataSource.query(
      `UPDATE refresh_token SET expires_at = now() - interval '1 minute' WHERE user_id = $1`,
      [user.id],
    );
    await refresh(cookie).expect(401);
  });

  it('el login de la app movil no cambia: token de JWT_EXPIRES_IN y sin cookie', async () => {
    const user = await createUser(dataSource, UserRole.REQUESTER);
    const response = await request(app.getHttpServer())
      .post(`${api}/auth/login`)
      .send({ email: user.email, password: PASSWORD })
      .expect(200);
    // En las pruebas JWT_EXPIRES_IN es 1h (setup-env.ts); en producción, 8h.
    expect(response.body.expiresIn).toBe(durationSeconds(process.env.JWT_EXPIRES_IN ?? '8h'));
    expect(response.body.expiresIn).toBeGreaterThan(15 * 60);
    expect(refreshCookie(response)).toBeUndefined();
  });

  it('a quien no es ADMIN no se le abre sesion ni se le deja cookie (RF-02)', async () => {
    const tech = await createUser(dataSource, UserRole.REQUESTER);
    const response = await request(app.getHttpServer())
      .post(`${api}/auth/session`)
      .send({ email: tech.email, password: PASSWORD })
      .expect(403);
    expect(response.body.message).toMatch(/usa la app en tu teléfono/);
    expect(refreshCookie(response)).toBeUndefined();
  });

  it('si le quitan el rol ADMIN con la sesion abierta, ya no refresca', async () => {
    const user = await createUser(dataSource, UserRole.ADMIN);
    const cookie = await session(user);
    await dataSource.query(`UPDATE "user" SET role = 'REQUESTER' WHERE id = $1`, [user.id]);
    await refresh(cookie).expect(401);
  });
});
