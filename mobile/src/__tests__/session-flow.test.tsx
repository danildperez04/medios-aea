import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import AppLayout from '@/app/(app)/_layout';
import HomeScreen from '@/app/(app)/home';
import Index from '@/app/index';
import { useSession, type SessionUser } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Redirect: ({ href }: { href: string }) => <Text>{`redirige a ${href}`}</Text>,
    Stack: () => <Text>pantallas de la app</Text>,
  };
});

const user: SessionUser = {
  id: 'u1',
  email: 'ana@aea.org',
  fullName: 'Ana Martínez',
  role: 'REQUESTER',
};

const respond = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('sesión de la app (HU-16)', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    jest.mocked(SecureStore.deleteItemAsync).mockClear();
    useSession.setState({ token: null, user: null, ready: true });
  });

  describe('al abrir la app', () => {
    it('con un token guardado entra directo, sin pedir la contraseña', async () => {
      useSession.setState({ token: 'guardado' });
      await render(<Index />);
      expect(screen.getByText('redirige a /home')).toBeTruthy();
    });

    it('sin token lleva al inicio de sesión', async () => {
      await render(<Index />);
      expect(screen.getByText('redirige a /login')).toBeTruthy();
    });

    it('no decide nada mientras se lee el almacenamiento seguro', async () => {
      useSession.setState({ ready: false });
      await render(<Index />);
      expect(screen.queryByText(/redirige/)).toBeNull();
    });
  });

  describe('zona autenticada', () => {
    it('pide el perfil con el token guardado y muestra la app', async () => {
      useSession.setState({ token: 'guardado' });
      (globalThis.fetch as jest.Mock).mockReturnValue(respond(200, user));
      await renderWithClient(<AppLayout />);
      expect(await screen.findByText('pantallas de la app')).toBeTruthy();
      expect(useSession.getState().user).toEqual(user);
    });

    it('si el servidor rechaza el token, borra la sesión y vuelve al login', async () => {
      useSession.setState({ token: 'vencido' });
      (globalThis.fetch as jest.Mock).mockReturnValue(
        respond(401, { message: 'Sesión no válida.' }),
      );
      await renderWithClient(<AppLayout />);
      expect(await screen.findByText('redirige a /login')).toBeTruthy();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('sin señal no cierra la sesión: explica y deja reintentar', async () => {
      useSession.setState({ token: 'guardado' });
      (globalThis.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Network request failed'),
      );
      await renderWithClient(<AppLayout />);
      expect(await screen.findByText(/No hay conexión con el servidor/)).toBeTruthy();
      expect(useSession.getState().token).toBe('guardado');

      (globalThis.fetch as jest.Mock).mockReturnValue(respond(200, user));
      await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
      expect(await screen.findByText('pantallas de la app')).toBeTruthy();
    });
  });

  it('cerrar sesión borra el token del teléfono y el perfil en memoria', async () => {
    useSession.setState({ token: 'guardado', user });
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(useSession.getState().token).toBeNull());
    expect(useSession.getState().user).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});
