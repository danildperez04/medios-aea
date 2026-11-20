import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as Response);

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('sesión de la app (HU-16)', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    jest.mocked(SecureStore.deleteItemAsync).mockClear();
    useSession.setState({ token: null, refreshToken: null, user: null, ready: true });
  });

  describe('al abrir la app', () => {
    it('con un token guardado entra directo, sin pedir la contraseña', async () => {
      useSession.setState({ token: 'guardado', refreshToken: 'refresh' });
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
      useSession.setState({ token: 'guardado', refreshToken: 'refresh' });
      (globalThis.fetch as jest.Mock).mockReturnValue(respond(200, user));
      await renderWithClient(<AppLayout />);
      expect(await screen.findByText('pantallas de la app')).toBeTruthy();
      expect(useSession.getState().user).toEqual(user);
    });

    it('si el token de acceso venció, renueva la sesión y muestra la app', async () => {
      useSession.setState({ token: 'vencido', refreshToken: 'refresh' });
      (globalThis.fetch as jest.Mock).mockImplementation(
        (url: string, init: { headers: Record<string, string> }) => {
          if (url.endsWith('/auth/mobile-session/refresh')) {
            return respond(200, { accessToken: 'nuevo', refreshToken: 'refresh-2' });
          }
          return init.headers.Authorization === 'Bearer nuevo'
            ? respond(200, user)
            : respond(401, { message: 'Sesión no válida.' });
        },
      );
      await renderWithClient(<AppLayout />);
      expect(await screen.findByText('pantallas de la app')).toBeTruthy();
      expect(useSession.getState()).toMatchObject({ token: 'nuevo', refreshToken: 'refresh-2' });
    });

    it('si el servidor rechaza la sesión, la borra y vuelve al login', async () => {
      useSession.setState({ token: 'vencido', refreshToken: 'revocado' });
      (globalThis.fetch as jest.Mock).mockReturnValue(
        respond(401, { message: 'Sesión no válida.' }),
      );
      await renderWithClient(<AppLayout />);
      expect(await screen.findByText('redirige a /login')).toBeTruthy();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('si la coordinación cerró sus sesiones, al volver a la app lleva al login', async () => {
      useSession.setState({ token: 'guardado', refreshToken: 'refresh' });
      (globalThis.fetch as jest.Mock).mockReturnValue(respond(200, user));
      await renderWithClient(<AppLayout />);
      expect(await screen.findByText('pantallas de la app')).toBeTruthy();

      // Desde el panel se cierran sus sesiones: la API rechaza el token y la renovación.
      (globalThis.fetch as jest.Mock).mockReturnValue(
        respond(401, { message: 'Tu sesión se cerró. Inicia sesión de nuevo.' }),
      );
      // La persona deja la app en segundo plano y vuelve.
      await act(async () => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      expect(await screen.findByText('redirige a /login')).toBeTruthy();
      expect(useSession.getState()).toMatchObject({ token: null, refreshToken: null });
      const paths = (globalThis.fetch as jest.Mock).mock.calls.map(([url]: [string]) => url);
      expect(paths.some((url) => url.endsWith('/auth/mobile-session/refresh'))).toBe(true);
      focusManager.setFocused(undefined);
    });

    it('sin señal no cierra la sesión: explica y deja reintentar', async () => {
      useSession.setState({ token: 'guardado', refreshToken: 'refresh' });
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

  describe('cerrar sesión', () => {
    const logoutCalls = () =>
      (globalThis.fetch as jest.Mock).mock.calls.filter(([url]: [string]) =>
        url.endsWith('/auth/mobile-session/logout'),
      );

    it('borra los tokens del teléfono y revoca el refresh token en el servidor', async () => {
      useSession.setState({ token: 'guardado', refreshToken: 'refresh', user });
      (globalThis.fetch as jest.Mock).mockReturnValue(respond(204, undefined));
      await renderWithClient(<HomeScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

      await waitFor(() => expect(logoutCalls()).toHaveLength(1));
      expect(JSON.parse(logoutCalls()[0][1].body)).toEqual({ refreshToken: 'refresh' });
      expect(useSession.getState()).toMatchObject({ token: null, refreshToken: null, user: null });
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('sin señal la sesión local se cierra igual', async () => {
      useSession.setState({ token: 'guardado', refreshToken: 'refresh', user });
      (globalThis.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
      await renderWithClient(<HomeScreen />);
      await fireEvent.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

      await waitFor(() => expect(logoutCalls()).toHaveLength(1));
      expect(useSession.getState()).toMatchObject({ token: null, refreshToken: null, user: null });
    });
  });
});
