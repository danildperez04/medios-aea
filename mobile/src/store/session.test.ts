import * as SecureStore from 'expo-secure-store';
import { useSession, type SessionUser } from './session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const user: SessionUser = {
  id: 'u1',
  email: 'ana@aea.org',
  fullName: 'Ana Martínez',
  role: 'REQUESTER',
};

describe('sesión', () => {
  const tokens = { accessToken: 't-1', refreshToken: 'r-1' };

  beforeEach(() => {
    jest.mocked(SecureStore.setItemAsync).mockClear();
    useSession.setState({ token: null, refreshToken: null, user: null, ready: false });
  });

  it('guarda los dos tokens en el almacenamiento seguro, no en memoria plana', async () => {
    await useSession.getState().setSession(tokens, user);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), 't-1');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), 'r-1');
    expect(useSession.getState()).toMatchObject({ token: 't-1', refreshToken: 'r-1', user });
  });

  it('tras una renovación cambia los tokens y conserva el perfil', async () => {
    await useSession.getState().setSession(tokens, user);
    await useSession.getState().setTokens({ accessToken: 't-2', refreshToken: 'r-2' });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), 'r-2');
    expect(useSession.getState()).toMatchObject({ token: 't-2', refreshToken: 'r-2', user });
  });

  it('al abrir la app toma los tokens guardados', () => {
    useSession.getState().markReady(tokens);
    expect(useSession.getState()).toMatchObject({ ready: true, token: 't-1', refreshToken: 'r-1' });
  });

  it('cerrar sesión borra los tokens del dispositivo', async () => {
    await useSession.getState().setSession(tokens, user);
    await useSession.getState().clearSession();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(useSession.getState()).toMatchObject({ token: null, refreshToken: null, user: null });
  });
});
