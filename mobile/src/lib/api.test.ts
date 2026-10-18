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
});
