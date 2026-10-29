import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/app/stores/auth.store';
import { api } from './api';
import { ApiError } from './api-error';
import { refreshSession, restoreSession, sessionClient } from './session';

const user = { id: 'u1', email: 'admin@aea.org', fullName: 'Coordinación', role: 'ADMIN' as const };

/** Respuesta o error de axios para un adaptador de prueba. */
function reply(config: InternalAxiosRequestConfig, status: number, data: unknown) {
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse;
  if (status < 400) return Promise.resolve(response);
  return Promise.reject(
    Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, config, response }),
  );
}

/** Sesión del panel en memoria con refresh por cookie (ADR 0003). */
describe('sesion del panel', () => {
  const originalSession = sessionClient.defaults.adapter;
  const originalApi = api.defaults.adapter;

  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, status: 'checking' });
  });
  afterEach(() => {
    sessionClient.defaults.adapter = originalSession;
    api.defaults.adapter = originalApi;
  });

  it('el refresh envia el encabezado del panel y la cookie, y guarda el token en memoria', async () => {
    const adapter = vi.fn<AxiosAdapter>((config) =>
      reply(config, 200, { accessToken: 't1', tokenType: 'Bearer', expiresIn: 900, user }),
    );
    sessionClient.defaults.adapter = adapter;

    await expect(refreshSession()).resolves.toBe('t1');
    const config = adapter.mock.calls[0][0];
    expect(config.url).toBe('/auth/session/refresh');
    expect(config.withCredentials).toBe(true);
    expect(config.headers['X-Medios-Client']).toBe('web');
    expect(useAuthStore.getState()).toMatchObject({ accessToken: 't1', status: 'authenticated' });
  });

  it('varias peticiones que necesitan token comparten un solo refresh', async () => {
    const adapter = vi.fn<AxiosAdapter>((config) =>
      reply(config, 200, { accessToken: 't2', tokenType: 'Bearer', expiresIn: 900, user }),
    );
    sessionClient.defaults.adapter = adapter;

    const tokens = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(tokens).toEqual(['t2', 't2', 't2']);
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('sin sesion queda anonimo y borra el token que guardaba la version anterior', async () => {
    localStorage.setItem('medios-aea-auth', '{"state":{"accessToken":"viejo"}}');
    sessionClient.defaults.adapter = (config) => reply(config, 401, { message: 'Sin sesión' });

    await restoreSession();
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(localStorage.getItem('medios-aea-auth')).toBeNull();
  });

  it('un 401 de la API renueva el token y repite la peticion una vez', async () => {
    useAuthStore.getState().setSession('vencido', user);
    sessionClient.defaults.adapter = (config) =>
      reply(config, 200, { accessToken: 'nuevo', tokenType: 'Bearer', expiresIn: 900, user });
    const seen: (string | undefined)[] = [];
    api.defaults.adapter = (config) => {
      const auth = String(config.headers.Authorization ?? '');
      seen.push(auth);
      return auth === 'Bearer nuevo' ? reply(config, 200, { ok: true }) : reply(config, 401, {});
    };

    const { data } = await api.get('/reservations');
    expect(data).toEqual({ ok: true });
    expect(seen).toEqual(['Bearer vencido', 'Bearer nuevo']);
  });

  it('los errores de la sesion llegan como ApiError con el mensaje de la API', async () => {
    sessionClient.defaults.adapter = (config) =>
      reply(config, 403, {
        statusCode: 403,
        message: 'Este panel es para la coordinación logística.',
      });

    const error = await sessionClient.post('/auth/session', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Este panel es para la coordinación logística.');
  });
});
