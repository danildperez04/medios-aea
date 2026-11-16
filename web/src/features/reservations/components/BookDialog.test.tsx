import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/app/services/api', () => ({
  api: {
    get: (url: string, config?: unknown) => get(url, config),
    post: (url: string, body?: unknown) => post(url, body),
  },
  ApiError: class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const { BookDialog } = await import('./BookDialog');

const carlos = { id: 'u2', fullName: 'Carlos Rivera' };
const project = { id: 'p1', code: 'PRY-AGUA', name: 'Agua segura' };
const hilux = { id: 'v1', name: 'Hilux blanca', identifier: 'M 123-456', passengerCapacity: 4 };
const jose = { id: 'd2', fullName: 'José Gutiérrez' };

function respond(resources = [hilux]) {
  get.mockImplementation((url: string) => {
    const page = (data: unknown[]) => ({ data, total: data.length, page: 1, limit: 100 });
    const data: Record<string, unknown> = {
      '/users': page([carlos]),
      '/projects': page([project]),
      '/availability': { available: resources, unavailable: [] },
      '/availability/drivers': { available: [jose], unavailable: [] },
    };
    return Promise.resolve({ data: data[url] });
  });
}

function renderDialog(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BookDialog open onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

async function pick(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(within(await screen.findByRole('listbox')).getByText(option));
}

async function fillTrip(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(get).toHaveBeenCalledWith('/projects', expect.anything()));
  await pick(user, 'Para quién', 'Carlos Rivera');
  await pick(user, 'Proyecto', 'PRY-AGUA · Agua segura');
  // Los campos de texto con `change`: escribir tecla por tecla hace la prueba lenta.
  const fill = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fill('Destino', 'Comunidad El Rosario');
  fill('Propósito', 'Taller de liderazgo');
  fill('Personas', '3');
  fill('Sale', '2026-12-01T08:00');
  fill('Vuelve', '2026-12-01T12:00');
}

/** Reserva directa desde el panel (HU-27). */
describe('BookDialog', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('pide los libres del horario y registra la reserva aprobada', async () => {
    respond();
    post.mockResolvedValue({ data: { id: 'r9', status: 'APPROVED' } });
    const onClose = renderDialog();
    const user = userEvent.setup({ delay: null });

    expect(screen.getByRole('combobox', { name: 'Medio' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await fillTrip(user);

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/availability', {
        params: {
          from: '2026-12-01T08:00:00-06:00',
          to: '2026-12-01T12:00:00-06:00',
          type: 'VEHICLE',
          passengers: 3,
        },
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Medio' })).not.toHaveAttribute('aria-disabled'),
    );
    await pick(user, 'Medio', 'Hilux blanca · M 123-456 · 4 pasajeros');
    await pick(user, 'Conduce', 'José Gutiérrez');
    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/reservations/book', {
        requesterId: carlos.id,
        projectId: project.id,
        destination: 'Comunidad El Rosario',
        purpose: 'Taller de liderazgo',
        passengers: 3,
        startsAt: '2026-12-01T08:00:00-06:00',
        endsAt: '2026-12-01T12:00:00-06:00',
        resourceId: hilux.id,
        driverId: jose.id,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('no envia sin medio ni conductor', async () => {
    respond();
    renderDialog();
    const user = userEvent.setup({ delay: null });
    await fillTrip(user);
    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    expect(await screen.findByText('Elige el medio')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('sin medios libres lo dice en lugar de ofrecer una lista vacia', async () => {
    respond([]);
    renderDialog();
    await fillTrip(userEvent.setup({ delay: null }));
    expect(await screen.findByText(/No hay medios libres para ese horario/)).toBeInTheDocument();
  });

  it('muestra el motivo si la API no deja reservar', async () => {
    const { ApiError } = await import('@/app/services/api');
    respond();
    post.mockRejectedValue(new ApiError(409, 'Hilux blanca ya tiene un viaje aprobado.'));
    renderDialog();
    const user = userEvent.setup({ delay: null });
    await fillTrip(user);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Medio' })).not.toHaveAttribute('aria-disabled'),
    );
    await pick(user, 'Medio', 'Hilux blanca · M 123-456 · 4 pasajeros');
    await pick(user, 'Conduce', 'José Gutiérrez');
    await user.click(screen.getByRole('button', { name: 'Reservar' }));

    expect(await screen.findByText('Hilux blanca ya tiene un viaje aprobado.')).toBeInTheDocument();
  });
});
