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
  beforeEach(() => useSession.setState({ token: null, user: null, ready: false }));

  it('guarda el token en el almacenamiento seguro, no en memoria plana', async () => {
    await useSession.getState().setSession('t-1', user);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), 't-1');
    expect(useSession.getState()).toMatchObject({ token: 't-1', user });
  });

  it('cerrar sesión borra el token del dispositivo', async () => {
    await useSession.getState().setSession('t-1', user);
    await useSession.getState().clearSession();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(useSession.getState()).toMatchObject({ token: null, user: null });
  });
});
