import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import HomeScreen from '@/app/(app)/home';
import { NewRequestScreen } from '@/features/requests/NewRequestScreen';
import { useSession, type SessionUser } from '@/store/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
// En las pruebas no hay selector nativo: el de iOS se cambia por un botón que elige
// el valor que la prueba deja en `nextPick`.
const nextPick: { value: Date | null } = { value: null };
jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Picker = ({ onChange }: { onChange: (event: { type: string }, date?: Date) => void }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Confirmar selección"
      onPress={() => onChange({ type: 'set' }, nextPick.value ?? undefined)}
    >
      <Text>selector</Text>
    </Pressable>
  );
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

const ana: SessionUser = {
  id: 'u1',
  email: 'ana@aea.org',
  fullName: 'Ana Martínez',
  role: 'REQUESTER',
};

// Martes 17/11/2026 a las 10:00 en Managua.
const NOW = new Date('2026-11-17T16:00:00Z');
const now = () => NOW;

const projects = {
  data: [
    { id: 'p1', code: 'PRY-AGUA', name: 'Agua segura' },
    { id: 'p2', code: 'PRY-EDU', name: 'Educación' },
  ],
};
const drivers = [
  { id: 'd1', userId: 'u1', fullName: 'Ana Martínez' },
  { id: 'd2', userId: 'u2', fullName: 'Luis Gómez' },
];
const hilux = { id: 'v1', name: 'Hilux blanca', identifier: 'M 123-456', passengerCapacity: 4 };

type Reply = { status: number; body?: unknown };
type Routes = Partial<Record<'projects' | 'drivers' | 'availability' | 'create', Reply>>;

/** API de mentira por ruta; guarda las URL y los cuerpos que recibe. */
function fakeApi(routes: Routes = {}) {
  const replies: Required<Routes> = {
    projects: { status: 200, body: projects },
    drivers: { status: 200, body: drivers },
    availability: { status: 200, body: { available: [hilux], unavailable: [] } },
    create: { status: 201, body: { id: 'r1', code: 'SOL-2026-00042' } },
    ...routes,
  };
  (globalThis.fetch as jest.Mock).mockImplementation((url: string, init: { method: string }) => {
    const path = url.replace(/^.*\/api\/v1/, '');
    const key = path.startsWith('/projects')
      ? 'projects'
      : path.startsWith('/drivers/options')
        ? 'drivers'
        : path.startsWith('/availability')
          ? 'availability'
          : init.method === 'POST' && path === '/reservations'
            ? 'create'
            : null;
    const reply = key ? replies[key] : { status: 404, body: { message: 'No existe' } };
    return Promise.resolve({
      ok: reply.status < 300,
      status: reply.status,
      text: () => Promise.resolve(reply.body === undefined ? '' : JSON.stringify(reply.body)),
    });
  });
}

const fetched = (prefix: string) =>
  (globalThis.fetch as jest.Mock).mock.calls
    .map(([url, init]: [string, { body?: string }]) => ({
      path: url.replace(/^.*\/api\/v1/, ''),
      body: init.body ? JSON.parse(init.body) : undefined,
    }))
    .filter((call) => call.path.startsWith(prefix));

async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <NewRequestScreen now={now} />
    </QueryClientProvider>,
  );
}

async function fillRequired() {
  await fireEvent.press(await screen.findByRole('radio', { name: 'Agua segura' }));
  await fireEvent.changeText(screen.getByLabelText('¿Para qué?'), 'Taller de liderazgo');
  await fireEvent.changeText(screen.getByLabelText('Destino'), 'El Rosario');
}

describe('nueva solicitud desde la app (HU-17)', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    nextPick.value = null;
    jest.mocked(router.back).mockClear();
    useSession.setState({ token: 't', refreshToken: 'r', user: ana, ready: true });
  });

  it('propone mañana de 8 a 12 y que conduzca quien pide, si tiene licencia', async () => {
    fakeApi();
    await renderScreen();
    expect(screen.getByLabelText('Día: miércoles 18 de noviembre')).toBeTruthy();
    expect(screen.getByLabelText('Salida: 8:00 a. m.')).toBeTruthy();
    expect(screen.getByLabelText('Regreso: 12:00 p. m.')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Yo (Ana Martínez)' })).toBeChecked(),
    );
  });

  it('antes de enviar muestra cuántos vehículos están libres en ese horario', async () => {
    fakeApi();
    await renderScreen();
    expect(await screen.findByText('1 vehículo libre para 1 persona')).toBeTruthy();
    expect(screen.getByText('Hilux blanca · M 123-456')).toBeTruthy();
    expect(screen.getByText(/Enviar no lo reserva/)).toBeTruthy();

    const [query] = fetched('/availability');
    const params = new URLSearchParams(query.path.split('?')[1]);
    expect(Object.fromEntries(params)).toEqual({
      from: '2026-11-18T08:00:00-06:00',
      to: '2026-11-18T12:00:00-06:00',
      type: 'VEHICLE',
      passengers: '1',
    });
  });

  it('al cambiar las personas vuelve a consultar con la nueva cantidad', async () => {
    fakeApi();
    await renderScreen();
    await screen.findByText('1 vehículo libre para 1 persona');
    await fireEvent.press(screen.getByRole('button', { name: 'Una persona más' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Una persona más' }));
    expect(await screen.findByText('1 vehículo libre para 3 personas')).toBeTruthy();
    expect(fetched('/availability').at(-1)?.path).toContain('passengers=3');
  });

  it('si no hay vehículos libres lo dice, y deja enviar igual', async () => {
    fakeApi({ availability: { status: 200, body: { available: [], unavailable: [] } } });
    await renderScreen();
    expect(await screen.findByText('No hay vehículos libres en ese horario')).toBeTruthy();
    await fillRequired();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('SOL-2026-00042')).toBeTruthy();
  });

  it('envía la solicitud con la zona horaria de Nicaragua y confirma con el código', async () => {
    fakeApi();
    await renderScreen();
    await fillRequired();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Luis Gómez' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('SOL-2026-00042')).toBeTruthy();
    expect(fetched('/reservations')[0].body).toEqual({
      projectId: 'p1',
      purpose: 'Taller de liderazgo',
      destination: 'El Rosario',
      passengers: 1,
      startsAt: '2026-11-18T08:00:00-06:00',
      endsAt: '2026-11-18T12:00:00-06:00',
      resourceType: 'VEHICLE',
      proposedDriverId: 'd2',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Volver al inicio' }));
    expect(router.back).toHaveBeenCalled();
  });

  it('no envía si falta lo obligatorio', async () => {
    fakeApi();
    await renderScreen();
    await screen.findByRole('radio', { name: 'Agua segura' });
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('Elige el proyecto')).toBeTruthy();
    expect(screen.getByText('Describe para qué es, con al menos 5 caracteres')).toBeTruthy();
    expect(screen.getByText('Indica el destino')).toBeTruthy();
    expect(fetched('/reservations')).toHaveLength(0);
  });

  it('si el regreso no es después de la salida, lo dice y no consulta ni envía', async () => {
    fakeApi();
    await renderScreen();
    await fillRequired();
    await screen.findByText('1 vehículo libre para 1 persona');
    const before = fetched('/availability').length;

    await fireEvent.press(screen.getByLabelText('Regreso: 12:00 p. m.'));
    nextPick.value = new Date(2026, 10, 18, 7, 0);
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar selección' }));

    expect(screen.getByLabelText('Regreso: 7:00 a. m.')).toBeTruthy();
    expect(
      await screen.findByText('La hora de regreso debe ser después de la de salida'),
    ).toBeTruthy();
    expect(fetched('/availability')).toHaveLength(before);
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(fetched('/reservations')).toHaveLength(0);
  });

  it('muestra el error de la API sin perder lo escrito', async () => {
    fakeApi({
      create: { status: 400, body: { message: 'El proyecto elegido está inactivo.' } },
    });
    await renderScreen();
    await fillRequired();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('El proyecto elegido está inactivo.')).toBeTruthy();
    expect(screen.getByLabelText('Destino').props.value).toBe('El Rosario');
  });

  it('si quien pide no tiene licencia, debe elegir quién conduce', async () => {
    fakeApi({ drivers: { status: 200, body: [drivers[1]] } });
    await renderScreen();
    await fillRequired();
    await screen.findByRole('radio', { name: 'Luis Gómez' });
    expect(screen.queryByRole('radio', { name: /Yo/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('Elige quién conduce')).toBeTruthy();
  });
});

describe('inicio: acceso a nueva solicitud', () => {
  it.each([
    ['REQUESTER', true],
    ['ADMIN', true],
    ['DRIVER', false],
  ] as const)('con rol %s el botón aparece: %s', async (role, visible) => {
    useSession.setState({ user: { ...ana, role } });
    globalThis.fetch = jest.fn();
    fakeApi();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await render(
      <QueryClientProvider client={client}>
        <HomeScreen />
      </QueryClientProvider>,
    );
    const button = screen.queryByRole('button', { name: 'Nueva solicitud' });
    expect(Boolean(button)).toBe(visible);
    if (button) {
      await fireEvent.press(button);
      expect(router.push).toHaveBeenCalledWith('/new-request');
    }
  });
});
