import * as Notifications from 'expo-notifications';
import { currentPushToken, forgetPushToken, pushTarget, registerForPush } from './push';
import { useSession } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
const constants: { expoConfig: { extra?: unknown } | null; easConfig: unknown } = {
  expoConfig: { extra: { eas: { projectId: 'proyecto-eas' } } },
  easConfig: null,
};
jest.mock('expo-constants', () => ({ __esModule: true, default: constants }));

const respond = (status: number) =>
  Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve('') } as Response);

describe('registerForPush (RF-20)', () => {
  beforeEach(() => {
    forgetPushToken();
    constants.expoConfig = { extra: { eas: { projectId: 'proyecto-eas' } } };
    globalThis.fetch = jest.fn(() => respond(204)) as unknown as typeof fetch;
    useSession.setState({ token: 't', refreshToken: 'r', user: null, ready: true });
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
  });

  it('registra el token de este teléfono en la API', async () => {
    await expect(registerForPush()).resolves.toEqual({
      status: 'registered',
      token: 'ExponentPushToken[test]',
    });
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proyecto-eas' });
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/notifications\/devices$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ token: 'ExponentPushToken[test]', platform: 'ios' });
    expect(currentPushToken()).toBe('ExponentPushToken[test]');
  });

  it('sin projectId de EAS no intenta nada (Expo Go sin cuenta)', async () => {
    constants.expoConfig = { extra: {} };
    await expect(registerForPush()).resolves.toEqual({ status: 'unconfigured' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('pide permiso si no lo tiene, y sin permiso no registra', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false } as never);
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    await expect(registerForPush()).resolves.toEqual({ status: 'denied' });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('si la API no responde, no lanza: la bandeja sigue funcionando', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Network request failed')),
    ) as unknown as typeof fetch;
    await expect(registerForPush()).resolves.toEqual({ status: 'failed' });
    expect(currentPushToken()).toBeNull();
  });
});

describe('pushTarget', () => {
  const response = (data: unknown) =>
    ({ notification: { request: { content: { data } } } }) as Notifications.NotificationResponse;

  it('toma la solicitud y el aviso del mensaje', () => {
    expect(pushTarget(response({ notificationId: 'n1', reservationId: 'r1' }))).toEqual({
      notificationId: 'n1',
      reservationId: 'r1',
    });
  });

  it('ignora datos que no son texto', () => {
    expect(pushTarget(response({ notificationId: 3, reservationId: '' }))).toEqual({
      notificationId: null,
      reservationId: null,
    });
    expect(pushTarget(response(null))).toEqual({ notificationId: null, reservationId: null });
  });
});
