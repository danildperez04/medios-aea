import { Platform } from 'react-native';
import { configurePush, notificationsModule, registerForPush } from './push';

// Solo se finge Expo Go: el resto de `expo` (p. ej. `requireNativeModule`) lo usan otros
// paquetes, como expo-secure-store.
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => true }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
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
