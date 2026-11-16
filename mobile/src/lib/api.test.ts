import { ApiError, apiRequest } from './api';
import { useSession } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

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

describe('apiRequest', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    useSession.setState({ token: 'token-de-prueba', user: null, ready: true });
  });

  it('envía el token y devuelve el cuerpo JSON', async () => {
    (globalThis.fetch as jest.Mock).mockReturnValue(respond(200, { ok: true }));
    await expect(apiRequest('/auth/me')).resolves.toEqual({ ok: true });
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token-de-prueba');
  });

  it('usa el mensaje en español que devuelve la API', async () => {
    (globalThis.fetch as jest.Mock).mockReturnValue(
      respond(409, { message: 'El vehículo ya está asignado.' }),
    );
    await expect(apiRequest('/reservations', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 409,
      message: 'El vehículo ya está asignado.',
    });
  });

  it('un 401 con sesión cierra la sesión (token vencido o revocado)', async () => {
    (globalThis.fetch as jest.Mock).mockReturnValue(respond(401, { message: 'Sesión no válida.' }));
    await expect(apiRequest('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(useSession.getState().token).toBeNull();
  });

  it('sin conexión explica qué pasó en lugar de un error técnico', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('No hay conexión'),
    });
  });

  it('un 502 en HTML del proxy se explica en español, sin error de sintaxis', async () => {
    (globalThis.fetch as jest.Mock).mockReturnValue(respondHtml(502));
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
    (globalThis.fetch as jest.Mock).mockReturnValue(respondHtml(200));
    await expect(apiRequest('/auth/me')).rejects.toMatchObject({
      status: 200,
      message: expect.stringContaining('no vino del servidor'),
    });
  });
});
