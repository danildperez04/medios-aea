import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import HomeScreen from '@/app/(app)/home';
import type { MyRequest } from '@/features/requests/api';
import { RequestDetailScreen } from '@/features/requests/RequestDetailScreen';
import { useSession, type SessionUser } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const ana: SessionUser = {
  id: 'u1',
  email: 'ana@aea.org',
  fullName: 'Ana Martínez',
  role: 'REQUESTER',
};

const request = (overrides: Partial<MyRequest> = {}): MyRequest => ({
  id: 'r1',
  code: 'SOL-2026-00042',
  status: 'PENDING',
  purpose: 'Taller de liderazgo',
  destination: 'El Rosario',
  passengers: 3,
  // Miércoles 18/11, de 8:00 a 12:00 en Managua.
  startsAt: '2026-11-18T14:00:00.000Z',
  endsAt: '2026-11-18T18:00:00.000Z',
  project: { id: 'p1', code: 'PRY-AGUA', name: 'Agua segura' },
  proposedDriver: { id: 'd1', fullName: 'Ana Martínez' },
  assignment: null,
  rejectionReason: null,
  decidedAt: null,
  createdAt: '2026-11-17T16:00:00.000Z',
  ...overrides,
});

const approved = request({
  id: 'r2',
  code: 'SOL-2026-00043',
  status: 'APPROVED',
  destination: 'Totogalpa',
  assignment: {
    resource: { id: 'v1', name: 'Hilux blanca', identifier: 'M 123-456' },
    driver: { id: 'd2', fullName: 'Luis Gómez' },
  },
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

const paths = () => (globalThis.fetch as jest.Mock).mock.calls.map(([url]: [string]) => url);

async function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('mis solicitudes (HU-18)', () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    useSession.setState({ token: 't', refreshToken: 'r', user: ana, ready: true });
  });

  it('lista las propias con estado, horario y vehículo asignado', async () => {
    fakeApi(() => ({ status: 200, body: { data: [request(), approved], total: 2 } }));
    await renderWith(<HomeScreen />);

    const pending = await screen.findByRole('button', { name: 'El Rosario, SOL-2026-00042' });
    expect(within(pending).getByText('Pendiente')).toBeTruthy();
    expect(
      within(pending).getByText('miércoles 18 de noviembre, 8:00 a. m. a 12:00 p. m.'),
    ).toBeTruthy();
    const trip = screen.getByRole('button', { name: 'Totogalpa, SOL-2026-00043' });
    expect(within(trip).getByText('Aprobada')).toBeTruthy();
    expect(within(trip).getByText('Hilux blanca · M 123-456')).toBeTruthy();

    // Solo las suyas, también si es de la coordinación.
    expect(paths().find((url) => url.includes('/reservations'))).toContain(
      '/reservations?mine=true',
    );
  });

  it('filtra por estado', async () => {
    fakeApi((path) => ({
      status: 200,
      body: path.includes('status=APPROVED')
        ? { data: [approved], total: 1 }
        : { data: [request(), approved], total: 2 },
    }));
    await renderWith(<HomeScreen />);
    await screen.findByText('SOL-2026-00042');

    await fireEvent.press(screen.getByRole('tab', { name: 'Aprobadas' }));

    expect(await screen.findByText('SOL-2026-00043')).toBeTruthy();
    expect(screen.queryByText('SOL-2026-00042')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Aprobadas' })).toBeSelected();
    expect(paths().at(-1)).toContain('status=APPROVED');
  });

  it('sin solicitudes explica cómo pedir la primera', async () => {
    fakeApi(() => ({ status: 200, body: { data: [], total: 0 } }));
    await renderWith(<HomeScreen />);
    expect(await screen.findByText(/Aún no has pedido ningún medio/)).toBeTruthy();
  });

  it('si no se pueden cargar, muestra el motivo', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Network request failed')),
    ) as unknown as typeof fetch;
    await renderWith(<HomeScreen />);
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeTruthy();
  });

  it('tocar una abre su detalle', async () => {
    fakeApi(() => ({ status: 200, body: { data: [approved], total: 1 } }));
    await renderWith(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Totogalpa, SOL-2026-00043' }));
    expect(router.push).toHaveBeenCalledWith('/requests/r2');
  });
});

describe('detalle de una solicitud (HU-18)', () => {
  beforeEach(() => {
    useSession.setState({ token: 't', refreshToken: 'r', user: ana, ready: true });
  });

  it('una aprobada muestra el vehículo y quién conduce', async () => {
    fakeApi(() => ({ status: 200, body: approved }));
    await renderWith(<RequestDetailScreen id="r2" />);
    expect(await screen.findByText('Hilux blanca · M 123-456')).toBeTruthy();
    expect(screen.getByText('Conduce')).toBeTruthy();
    expect(screen.getByText('Luis Gómez')).toBeTruthy();
    expect(screen.getByText('Agua segura (PRY-AGUA)')).toBeTruthy();
  });

  it('una pendiente dice que el vehículo aún no se asigna y a quién propuso', async () => {
    fakeApi(() => ({ status: 200, body: request() }));
    await renderWith(<RequestDetailScreen id="r1" />);
    expect(await screen.findByText('Sin asignar todavía')).toBeTruthy();
    expect(screen.getByText('Propusiste que conduzca')).toBeTruthy();
    expect(screen.getByText(/La coordinación aún no la revisa/)).toBeTruthy();
  });

  it('una rechazada muestra el motivo y no se puede cancelar', async () => {
    fakeApi(() => ({
      status: 200,
      body: request({ status: 'REJECTED', rejectionReason: 'Se cruza con la feria' }),
    }));
    await renderWith(<RequestDetailScreen id="r1" />);
    expect(await screen.findByText('Se cruza con la feria')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar solicitud' })).toBeNull();
  });

  it('cancelar pide confirmación y, al confirmar, queda cancelada', async () => {
    fakeApi((path, method) =>
      method === 'POST' && path === '/reservations/r2/cancel'
        ? { status: 200, body: { ...approved, status: 'CANCELLED' } }
        : { status: 200, body: approved },
    );
    await renderWith(<RequestDetailScreen id="r2" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar solicitud' }));
    expect(screen.getByText(/El vehículo y quien conduce quedarán libres/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Sí, cancelar' }));

    expect(await screen.findByText(/Cancelaste la solicitud/)).toBeTruthy();
    expect(screen.getByText('Cancelada')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cancelar solicitud' })).toBeNull();
    expect(paths().filter((url) => url.endsWith('/cancel'))).toHaveLength(1);
  });

  it('si se arrepiente, no cancela nada', async () => {
    fakeApi(() => ({ status: 200, body: request() }));
    await renderWith(<RequestDetailScreen id="r1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar solicitud' }));
    await fireEvent.press(screen.getByRole('button', { name: 'No, mantenerla' }));
    expect(screen.getByRole('button', { name: 'Cancelar solicitud' })).toBeTruthy();
    expect(paths().filter((url) => url.endsWith('/cancel'))).toHaveLength(0);
  });

  it('si el viaje ya inició, muestra lo que responde la API', async () => {
    fakeApi((path, method) =>
      method === 'POST'
        ? {
            status: 409,
            body: { message: 'El viaje ya inició; no se puede cancelar.' },
          }
        : { status: 200, body: approved },
    );
    await renderWith(<RequestDetailScreen id="r2" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar solicitud' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sí, cancelar' }));
    expect(await screen.findByText('El viaje ya inició; no se puede cancelar.')).toBeTruthy();
    expect(screen.getByText('Aprobada')).toBeTruthy();
  });

  it('la de otra persona responde 404 y se dice', async () => {
    fakeApi(() => ({ status: 404, body: { message: 'La solicitud no existe.' } }));
    await renderWith(<RequestDetailScreen id="ajena" />);
    expect(await screen.findByText('La solicitud no existe.')).toBeTruthy();
  });
});
