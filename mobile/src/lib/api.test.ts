import { ApiError, apiRequest } from './api';
import { useSession } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

type FetchInit = { method: string; headers: Record<string, string>; body?: string };

const respond = (status: number, body?: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as Response);

const respondHtml = (status: number) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve('<html><body><h1>502 Bad Gateway</h1></body></html>'),
  } as Response);

const REFRESH = '/auth/mobile-session/refresh';
const fetchMock = () => globalThis.fetch as jest.Mock;
/** Llamadas a fetch como [ruta, opciones]. */
const calls = () =>
  fetchMock().mock.calls.map(([url, init]: [string, FetchInit]) => ({
    path: url.replace(/^.*\/api\/v1/, ''),
    init,
  }));

/**
 * API de mentira con sesión: acepta solo el token de acceso `valid` y renueva según
 * `onRefresh`. Sirve para probar el flujo completo sin fijar el orden de las llamadas.
 */
function fakeApi(valid: string, onRefresh: () => Promise<Response>) {
  fetchMock().mockImplementation((url: string, init: FetchInit) => {
    if (url.endsWith(REFRESH)) return onRefresh();
    return init.headers.Authorization === `Bearer ${valid}`
      ? respond(200, { ok: true })
      : respond(401, { message: 'Sesión no válida.' });
  });
}

describe('apiRequest', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    useSession.setState({
      token: 'token-de-prueba',
      refreshToken: 'refresh-de-prueba',
      user: null,
      ready: true,
    });
  });

  it('envía el token y devuelve el cuerpo JSON', async () => {
    fetchMock().mockReturnValue(respond(200, { ok: true }));
    await expect(apiRequest('/auth/me')).resolves.toEqual({ ok: true });
    expect(calls()[0].init.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('usa el mensaje en español que devuelve la API', async () => {
    fetchMock().mockReturnValue(respond(409, { message: 'El vehículo ya está asignado.' }));
    await expect(apiRequest('/reservations', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 409,
      message: 'El vehículo ya está asignado.',
    });
  });

  it('sin conexión explica qué pasó en lugar de un error técnico', async () => {
    fetchMock().mockRejectedValue(new TypeError('Network request failed'));
    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('No hay conexión'),
    });
    expect(useSession.getState().token).toBe('token-de-prueba');
  });

  it('un 502 en HTML del proxy se explica en español, sin error de sintaxis', async () => {
    fetchMock().mockReturnValue(respondHtml(502));
    const error = await apiRequest('/auth/me').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 502,
      message: 'El servidor no responde en este momento. Intenta de nuevo en unos minutos.',
    });
    // Un fallo del proxy no dice nada sobre la sesión: no se cierra.
    expect(useSession.getState().token).toBe('token-de-prueba');
  });

  it('un 200 que no es JSON no se toma como respuesta de la API', async () => {
    fetchMock().mockReturnValue(respondHtml(200));
    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining('no vino del servidor'),
    });
  });

  describe('renovación de la sesión (HU-28)', () => {
    const renewed = { accessToken: 'token-nuevo', refreshToken: 'refresh-nuevo' };

    it('si el token venció, renueva y repite la petición sin que se note', async () => {
      fakeApi('token-nuevo', () => respond(200, renewed));

      await expect(apiRequest('/reservations/mine')).resolves.toEqual({ ok: true });

      expect(calls().map((call) => call.path)).toEqual([
        '/reservations/mine',
        REFRESH,
        '/reservations/mine',
      ]);
      // La renovación manda el refresh token en el cuerpo y sin token de acceso.
      const refresh = calls()[1].init;
      expect(JSON.parse(refresh.body ?? '{}')).toEqual({ refreshToken: 'refresh-de-prueba' });
      expect(refresh.headers.Authorization).toBeUndefined();
      // Los tokens nuevos quedan guardados: el refresh token rotó.
      expect(useSession.getState()).toMatchObject({
        token: 'token-nuevo',
        refreshToken: 'refresh-nuevo',
      });
    });

    it('varias peticiones a la vez comparten una sola renovación', async () => {
      fakeApi('token-nuevo', () => respond(200, renewed));

      const results = await Promise.all([
        apiRequest('/reservations/mine'),
        apiRequest('/notifications'),
        apiRequest('/auth/me'),
      ]);

      expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
      expect(calls().filter((call) => call.path === REFRESH)).toHaveLength(1);
    });

    it('una petición que llega tarde usa el token ya renovado, sin renovar otra vez', async () => {
      fakeApi('token-nuevo', () => respond(200, renewed));
      await apiRequest('/auth/me');
      fetchMock().mockClear();

      // Sale con el token viejo; mientras viaja, otra petición renueva la sesión.
      useSession.setState({ token: 'token-de-prueba' });
      fetchMock().mockImplementationOnce(() => {
        useSession.setState({ token: 'token-nuevo', refreshToken: 'refresh-nuevo' });
        return respond(401, { message: 'Sesión no válida.' });
      });

      await expect(apiRequest('/notifications')).resolves.toEqual({ ok: true });
      expect(calls().filter((call) => call.path === REFRESH)).toHaveLength(0);
    });

    it('si la API rechaza la renovación, cierra la sesión', async () => {
      fakeApi('ninguno', () =>
        respond(401, { message: 'Tu sesión venció. Inicia sesión de nuevo.' }),
      );

      await expect(apiRequest('/auth/me')).rejects.toMatchObject({ status: 401 });

      expect(useSession.getState()).toMatchObject({ token: null, refreshToken: null });
      // No repite la petición original ni insiste con la renovación.
      expect(calls().map((call) => call.path)).toEqual(['/auth/me', REFRESH]);
    });

    it('sin señal al renovar no cierra la sesión', async () => {
      fakeApi('ninguno', () => Promise.reject(new TypeError('Network request failed')));

      await expect(apiRequest('/auth/me')).rejects.toMatchObject({
        status: 0,
        message: expect.stringContaining('No hay conexión'),
      });

      expect(useSession.getState()).toMatchObject({
        token: 'token-de-prueba',
        refreshToken: 'refresh-de-prueba',
      });
    });

    it.each([502, 429, 500])(
      'un %i al renovar no cierra la sesión: el servidor no la rechazó',
      async (status) => {
        fakeApi('ninguno', () =>
          status === 502 ? respondHtml(502) : respond(status, { message: 'Intenta más tarde.' }),
        );

        await expect(apiRequest('/auth/me')).rejects.toMatchObject({ status });
        expect(useSession.getState().refreshToken).toBe('refresh-de-prueba');
      },
    );

    it('tras un intento sin señal, el siguiente vuelve a renovar', async () => {
      fakeApi('ninguno', () => Promise.reject(new TypeError('Network request failed')));
      await expect(apiRequest('/auth/me')).rejects.toMatchObject({ status: 0 });

      fakeApi('token-nuevo', () => respond(200, renewed));
      await expect(apiRequest('/auth/me')).resolves.toEqual({ ok: true });
    });

    it('un 401 al iniciar sesión es una contraseña incorrecta, no una sesión vencida', async () => {
      fetchMock().mockReturnValue(respond(401, { message: 'Correo o contraseña incorrectos.' }));

      await expect(
        apiRequest('/auth/mobile-session', { method: 'POST', body: {}, auth: false }),
      ).rejects.toMatchObject({ status: 401, message: 'Correo o contraseña incorrectos.' });

      expect(calls()).toHaveLength(1);
      expect(calls()[0].init.headers.Authorization).toBeUndefined();
      expect(useSession.getState().token).toBe('token-de-prueba');
    });
  });
});
