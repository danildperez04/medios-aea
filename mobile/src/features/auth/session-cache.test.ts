import { QueryClient } from '@tanstack/react-query';
import { clearCacheOnSessionEnd } from './session-cache';
import { useSession } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

describe('clearCacheOnSessionEnd', () => {
  const key = ['reservations', 'mine'];
  let client: QueryClient;
  let stop: () => void;

  beforeEach(() => {
    useSession.setState({ token: 't-1', user: null, ready: true });
    client = new QueryClient();
    client.setQueryData(key, [{ id: 'r1' }]);
    stop = clearCacheOnSessionEnd(client);
  });
  afterEach(() => {
    stop();
    client.clear();
  });

  it('al cerrar sesión no queda ningún dato de la persona anterior', async () => {
    await useSession.getState().clearSession();
    expect(client.getQueryData(key)).toBeUndefined();
  });

  it('mientras la sesión sigue, la caché no se toca', () => {
    useSession.getState().setUser({
      id: 'u1',
      email: 'ana@aea.org',
      fullName: 'Ana Martínez',
      role: 'REQUESTER',
    });
    expect(client.getQueryData(key)).toEqual([{ id: 'r1' }]);
  });
});
