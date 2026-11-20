import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import type { Notice } from '@/features/notifications/api';
import { InboxScreen } from '@/features/notifications/InboxScreen';
import { NoticesButton } from '@/features/notifications/NoticesButton';
import { usePushNotifications } from '@/features/notifications/usePushNotifications';
import { logout } from '@/features/auth/api';
import { forgetPushToken, registerForPush } from '@/lib/push';
import { useSession, type SessionUser } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proyecto-eas' } } }, easConfig: null },
}));

const ana: SessionUser = {
  id: 'u1',
  email: 'ana@aea.org',
  fullName: 'Ana Martínez',
  role: 'REQUESTER',
};

const notice = (overrides: Partial<Notice> = {}): Notice => ({
  id: 'n1',
  title: 'Solicitud SOL-2026-00042 aprobada',
  body: 'Tu viaje a El Rosario quedó con la Hilux blanca.',
  data: { kind: 'RESERVATION_APPROVED', reservationId: 'r1' },
  readAt: null,
  // Miércoles 18/11, 8:30 a. m. en Managua.
  createdAt: '2026-11-18T14:30:00.000Z',
  ...overrides,
});

type Handler = (path: string, method: string) => { status: number; body?: unknown };
function fakeApi(handler: Handler) {
  globalThis.fetch = jest.fn((url: string, init: { method: string }) => {
    const reply = handler(url.replace(/^.*\/api\/v1/, ''), init.method);
    return Promise.resolve({
      ok: reply.status < 300,
      status: reply.status,
      text: () => Promise.resolve(reply.body === undefined ? '' : JSON.stringify(reply.body)),
    });
  }) as unknown as typeof fetch;
}
const calls = () =>
  (globalThis.fetch as jest.Mock).mock.calls.map(
    ([url, init]: [string, { method: string; body?: string }]) => ({
      path: url.replace(/^.*\/api\/v1/, ''),
      method: init.method,
      body: init.body ? JSON.parse(init.body) : undefined,
    }),
  );

async function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.mocked(router.push).mockClear();
  forgetPushToken();
  useSession.setState({ token: 't', refreshToken: 'r', user: ana, ready: true });
});

describe('bandeja de avisos (HU-19)', () => {
  it('muestra los avisos y distingue los no leídos', async () => {
    fakeApi(() => ({
      status: 200,
      body: {
        data: [notice(), notice({ id: 'n2', title: 'Ya leído', readAt: '2026-11-18T15:00:00Z' })],
        total: 2,
      },
    }));
    await renderWith(<InboxScreen />);
    expect(
      await screen.findByRole('button', { name: 'Sin leer. Solicitud SOL-2026-00042 aprobada' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ya leído' })).toBeTruthy();
    expect(screen.getAllByText('miércoles 18 de noviembre, 8:30 a. m.')).toHaveLength(2);
  });

  it('tocar un aviso lo marca como leído y abre la solicitud', async () => {
    fakeApi((path, method) =>
      method === 'POST'
        ? { status: 200, body: { ...notice(), readAt: '2026-11-18T15:00:00Z' } }
        : { status: 200, body: { data: [notice()], total: 1 } },
    );
    await renderWith(<InboxScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Sin leer. Solicitud SOL-2026-00042 aprobada' }),
    );
    expect(router.push).toHaveBeenCalledWith('/requests/r1');
    await waitFor(() =>
      expect(calls().some((c) => c.method === 'POST' && c.path === '/notifications/n1/read')).toBe(
        true,
      ),
    );
  });

  it('a quien conduce no lo lleva al detalle, que no puede abrir', async () => {
    useSession.setState({ user: { ...ana, role: 'DRIVER' } });
    fakeApi((path, method) =>
      method === 'POST'
        ? { status: 200, body: notice() }
        : { status: 200, body: { data: [notice()], total: 1 } },
    );
    await renderWith(<InboxScreen />);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Sin leer. Solicitud SOL-2026-00042 aprobada' }),
    );
    expect(router.push).not.toHaveBeenCalledWith('/requests/r1');
  });

  it('marca todos como leídos', async () => {
    fakeApi((path, method) =>
      method === 'POST'
        ? { status: 200, body: { updated: 1 } }
        : { status: 200, body: { data: [notice()], total: 1 } },
    );
    await renderWith(<InboxScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Marcar todos como leídos' }));
    await waitFor(() =>
      expect(calls().some((c) => c.method === 'POST' && c.path === '/notifications/read-all')).toBe(
        true,
      ),
    );
  });

  it('sin avisos explica qué llegará aquí', async () => {
    fakeApi(() => ({ status: 200, body: { data: [], total: 0 } }));
    await renderWith(<InboxScreen />);
    expect(await screen.findByText(/te avisaremos cuando la coordinación/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Marcar todos como leídos' })).toBeNull();
  });
});

describe('botón de avisos', () => {
  it('muestra cuántos hay sin leer y abre la bandeja', async () => {
    fakeApi(() => ({ status: 200, body: { count: 3 } }));
    await renderWith(<NoticesButton />);
    const button = await screen.findByRole('button', { name: 'Avisos, 3 sin leer' });
    await fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });

  it('sin avisos nuevos no muestra número', async () => {
    fakeApi(() => ({ status: 200, body: { count: 0 } }));
    await renderWith(<NoticesButton />);
    await waitFor(() => expect(calls()).toHaveLength(1));
    expect(screen.getByRole('button', { name: 'Avisos' })).toBeTruthy();
  });
});

describe('push en la zona autenticada', () => {
  function Probe() {
    usePushNotifications(useSession((state) => state.user));
    return null;
  }
  const tap = (data: Record<string, unknown>, identifier = 'push-1') =>
    ({
      actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
      notification: { request: { identifier, content: { data } } },
    }) as unknown as Notifications.NotificationResponse;

  it('registra el teléfono al entrar', async () => {
    fakeApi(() => ({ status: 204 }));
    await renderWith(<Probe />);
    await waitFor(() =>
      expect(calls().some((c) => c.method === 'PUT' && c.path === '/notifications/devices')).toBe(
        true,
      ),
    );
  });

  it('tocar un aviso push lo marca como leído y abre la solicitud, una sola vez', async () => {
    fakeApi(() => ({ status: 204 }));
    await renderWith(<Probe />);
    const listener = jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mock.calls.at(-1)?.[0];
    listener?.(tap({ notificationId: 'n9', reservationId: 'r9' }, 'push-9'));
    listener?.(tap({ notificationId: 'n9', reservationId: 'r9' }, 'push-9'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/requests/r9');
    await waitFor(() =>
      expect(calls().some((c) => c.method === 'POST' && c.path === '/notifications/n9/read')).toBe(
        true,
      ),
    );
  });

  it('si la app se abrió tocando un aviso, también lleva a la solicitud', async () => {
    fakeApi(() => ({ status: 204 }));
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(tap({ reservationId: 'r7' }, 'push-cold'));
    await renderWith(<Probe />);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/requests/r7'));
  });
});

describe('cerrar sesión', () => {
  it('manda el token push para que la API deje de avisar a este teléfono', async () => {
    fakeApi(() => ({ status: 204 }));
    await registerForPush();
    await logout();
    const out = calls().find((c) => c.path === '/auth/mobile-session/logout');
    expect(out?.body).toEqual({ refreshToken: 'r', pushToken: 'ExponentPushToken[test]' });
  });
});
