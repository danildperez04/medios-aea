import * as SecureStore from 'expo-secure-store';
import { tokenStorage } from './token-storage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const stored = (values: Record<string, string>) =>
  jest
    .mocked(SecureStore.getItemAsync)
    .mockImplementation(async (key: string) => values[key] ?? null);

describe('tokenStorage', () => {
  it('devuelve los dos tokens guardados', async () => {
    stored({ 'medios-aea.access-token': 'a', 'medios-aea.refresh-token': 'r' });
    await expect(tokenStorage.get()).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' });
  });

  it('una sesión de la versión anterior, sin refresh token, no sirve: pide entrar de nuevo', async () => {
    stored({ 'medios-aea.access-token': 'a' });
    await expect(tokenStorage.get()).resolves.toBeNull();
  });
});
