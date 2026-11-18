import { Platform } from 'react-native';
import { configurePush, notificationsModule, registerForPush } from './push';

jest.mock('expo', () => ({ isRunningInExpoGo: () => true }));
// Si push.ts cargara el paquete, la fábrica marcaría la carga.
const mockLoaded = jest.fn();
jest.mock('expo-notifications', () => {
  mockLoaded();
  return {};
});

describe('push en Expo Go para Android', () => {
  const original = Platform.OS;
  beforeAll(() => {
    Platform.OS = 'android';
  });
  afterAll(() => {
    Platform.OS = original;
  });

  it('no carga expo-notifications, que rompería la app, y no intenta registrar', async () => {
    expect(notificationsModule()).toBeNull();
    expect(() => configurePush()).not.toThrow();
    await expect(registerForPush()).resolves.toEqual({ status: 'unsupported' });
    expect(mockLoaded).not.toHaveBeenCalled();
  });
});
