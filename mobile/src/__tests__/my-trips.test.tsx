import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import HomeScreen from '@/app/(app)/home';
import { openNotice } from '@/features/notifications/open';
import type { Trip } from '@/features/trips/api';
import { MyTrips } from '@/features/trips/MyTrips';
import { TripDetailScreen } from '@/features/trips/TripDetailScreen';
import { useSession, type SessionUser } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

const luis: SessionUser = {
  id: 'u2',
  email: 'luis@aea.org',
  fullName: 'Luis Gómez',
  role: 'REQUESTER',
};

// Miércoles 18/11/2026, 10:00 en Managua.
const NOW = new Date('2026-11-18T16:00:00Z');

const trip = (overrides: Partial<Trip> = {}): Trip => ({
  reservationId: 'r1',
  code: 'SOL-2026-00042',
  state: 'UPCOMING',
  purpose: 'Taller de liderazgo',
  destination: 'El Rosario',
  passengers: 3,
  // Jueves 19/11, 8:00 a 12:00.
  startsAt: '2026-11-19T14:00:00.000Z',
  endsAt: '2026-11-19T18:00:00.000Z',
  project: { code: 'PRY-AGUA', name: 'Agua segura' },
  requester: { fullName: 'Ana Martínez', phone: '8888-0001' },
  vehicle: { name: 'Hilux blanca', identifier: 'M 123-456', passengerCapacity: 4 },
  log: null,
  ...overrides,
});

const today = trip({
  reservationId: 'r2',
  code: 'SOL-2026-00040',
  destination: 'Totogalpa',
  startsAt: '2026-11-18T19:00:00.000Z',
  endsAt: '2026-11-18T22:00:00.000Z',
});
const inProgress = trip({
  reservationId: 'r3',
  code: 'SOL-2026-00030',
  destination: 'Somoto',
  state: 'IN_PROGRESS',
  startsAt: '2026-11-16T14:00:00.000Z',
  endsAt: '2026-11-16T18:00:00.000Z',
  log: { startedAt: '2026-11-16T14:05:00.000Z', finishedAt: null },
});

type Handler = (path: string) => { status: number; body?: unknown };
function fakeApi(handler: Handler) {
  globalThis.fetch = jest.fn((url: string) => {
    const reply = handler(url.replace(/^.*\/api\/v1/, ''));
    return Promise.resolve({
      ok: reply.status < 300,
      status: reply.status,
      text: () => Promise.resolve(reply.body === undefined ? '' : JSON.stringify(reply.body)),
    });
  }) as unknown as typeof fetch;
}
/** Responde viajes y solicitudes; lo demás (avisos), vacío. */
const withTrips =
  (trips: Trip[]): Handler =>
  (path) =>
    path.startsWith('/trips/mine')
      ? { status: 200, body: trips }
      : path.startsWith('/reservations')
        ? { status: 200, body: { data: [], total: 0 } }
        : { status: 200, body: { count: 0 } };

async function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.mocked(router.push).mockClear();
  useSession.setState({ token: 't', refreshToken: 'r', user: luis, ready: true });
});

describe('mis viajes (HU-20)', () => {
  it('separa los de hoy (incluido uno en curso) de los próximos', async () => {
    fakeApi(withTrips([inProgress, today, trip()]));
    await renderWith(<MyTrips now={NOW} />);

    const somoto = await screen.findByRole('button', { name: 'Viaje a Somoto, SOL-2026-00030' });
    expect(within(somoto).getByText('En curso')).toBeTruthy();
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText('Próximos')).toBeTruthy();
    expect(screen.getByText('miércoles 18 de noviembre, 1:00 p. m. a 4:00 p. m.')).toBeTruthy();
    expect(screen.getAllByText('Hilux blanca · M 123-456')).toHaveLength(3);

    // Orden de lectura: hoy (en curso y de hoy) y después los próximos.
    const labels = screen
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel as string);
    expect(labels).toEqual([
      'Viaje a Somoto, SOL-2026-00030',
      'Viaje a Totogalpa, SOL-2026-00040',
      'Viaje a El Rosario, SOL-2026-00042',
    ]);
  });

  it('tocar un viaje abre su detalle', async () => {
    fakeApi(withTrips([trip()]));
    await renderWith(<MyTrips now={NOW} />);
    await fireEvent.press(await screen.findByRole('button', { name: /Viaje a El Rosario/ }));
    expect(router.push).toHaveBeenCalledWith('/trips/r1');
  });

  it('un técnico que conduce ve sus viajes en el inicio, junto a sus solicitudes', async () => {
    fakeApi(withTrips([trip()]));
    await renderWith(<HomeScreen />);
    expect(await screen.findByText('Mis viajes')).toBeTruthy();
    expect(screen.getByText('Mis solicitudes')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nueva solicitud' })).toBeTruthy();
  });

  it('un técnico sin viajes ve la sección con el aviso de que no tiene', async () => {
    fakeApi(withTrips([]));
    await renderWith(<HomeScreen />);
    await screen.findByText('Mis solicitudes');
    expect(screen.getByText('Mis viajes')).toBeTruthy();
    expect(await screen.findByText(/No tienes viajes asignados como conductor/)).toBeTruthy();
  });

  it('si los viajes no cargan, el técnico ve el motivo en lugar de una sección escondida', async () => {
    fakeApi((path) =>
      path.startsWith('/trips/mine')
        ? { status: 500, body: { message: 'Ocurrió un error inesperado. Intenta de nuevo.' } }
        : withTrips([])(path),
    );
    await renderWith(<HomeScreen />);
    expect(await screen.findByText('Ocurrió un error inesperado. Intenta de nuevo.')).toBeTruthy();
  });

  it('un chofer de planta ve solo sus viajes, y si no tiene, lo dice', async () => {
    useSession.setState({ user: { ...luis, role: 'DRIVER' } });
    fakeApi(withTrips([]));
    await renderWith(<HomeScreen />);
    expect(await screen.findByText(/No tienes viajes asignados/)).toBeTruthy();
    expect(screen.queryByText('Mis solicitudes')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nueva solicitud' })).toBeNull();
  });

  it('si no se pueden cargar, el chofer de planta ve el motivo', async () => {
    useSession.setState({ user: { ...luis, role: 'DRIVER' } });
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Network request failed')),
    ) as unknown as typeof fetch;
    await renderWith(<MyTrips now={NOW} />);
    expect(await screen.findByText(/No hay conexión con el servidor/)).toBeTruthy();
  });
});

describe('detalle de un viaje (HU-20)', () => {
  it('muestra el vehículo, las personas y quién lo pidió, con su teléfono', async () => {
    fakeApi(() => ({ status: 200, body: trip() }));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWith(<TripDetailScreen reservationId="r1" />);

    expect(await screen.findByText('Viaje SOL-2026-00042')).toBeTruthy();
    expect(screen.getByText('Hilux blanca · M 123-456')).toBeTruthy();
    expect(screen.getByText('3 (caben 4)')).toBeTruthy();
    expect(screen.getByText('Ana Martínez')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Llamar a Ana Martínez, 8888-0001' }));
    expect(openURL).toHaveBeenCalledWith('tel:88880001');
  });

  it('sin teléfono registrado no ofrece llamar', async () => {
    fakeApi(() => ({ status: 200, body: trip({ requester: { fullName: 'Ana', phone: null } }) }));
    await renderWith(<TripDetailScreen reservationId="r1" />);
    await screen.findByText('Viaje SOL-2026-00042');
    expect(screen.queryByRole('button', { name: /Llamar/ })).toBeNull();
  });

  it('un viaje en curso recuerda que falta registrar la llegada', async () => {
    fakeApi(() => ({ status: 200, body: inProgress }));
    await renderWith(<TripDetailScreen reservationId="r3" />);
    expect(await screen.findByText(/falta registrar la llegada/)).toBeTruthy();
  });

  it('un viaje que no conduce responde con el motivo de la API', async () => {
    fakeApi(() => ({ status: 404, body: { message: 'No tienes asignado ese viaje.' } }));
    await renderWith(<TripDetailScreen reservationId="ajeno" />);
    expect(await screen.findByText('No tienes asignado ese viaje.')).toBeTruthy();
  });
});

describe('a dónde lleva un aviso', () => {
  it('a quien conduce, a su viaje, tenga el rol que tenga', () => {
    for (const role of ['REQUESTER', 'ADMIN', 'DRIVER'] as const) {
      jest.mocked(router.push).mockClear();
      openNotice({ reservationId: 'r1', audience: 'DRIVER' }, role);
      expect(router.push).toHaveBeenCalledWith('/trips/r1');
    }
  });

  it('a quien dejó de conducir, a la bandeja', () => {
    openNotice({ reservationId: 'r1', audience: 'FORMER_DRIVER' }, 'REQUESTER');
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });

  it('a quien pidió, a su solicitud; a un chofer de planta sin viaje, a la bandeja', () => {
    openNotice({ reservationId: 'r1' }, 'REQUESTER');
    expect(router.push).toHaveBeenLastCalledWith('/requests/r1');
    openNotice({ reservationId: 'r1' }, 'DRIVER');
    expect(router.push).toHaveBeenLastCalledWith('/notifications');
  });
});
