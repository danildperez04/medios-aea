import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/app/services/api', () => ({
  api: { get: (...args: unknown[]) => get(...args) },
  ApiError: class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const { AgendaView } = await import('./AgendaView');
const { ApiError } = await import('@/app/services/api');

const agenda = {
  from: '2026-10-19T06:00:00.000Z',
  to: '2026-10-26T06:00:00.000Z',
  rows: [
    {
      id: 'v1',
      type: 'VEHICLE',
      name: 'Hilux blanca',
      status: 'AVAILABLE',
      identifier: 'M 123-456',
      blocks: [
        {
          id: 'a1',
          start: '2026-10-21T13:00:00.000Z',
          end: '2026-10-21T18:00:00.000Z',
          state: 'ASSIGNED',
          label: 'Somoto · Ana Martínez',
        },
        {
          id: 'b1',
          start: '2026-10-22T14:00:00.000Z',
          end: '2026-10-23T23:00:00.000Z',
          state: 'UNAVAILABLE',
          label: 'Cambio de frenos',
        },
      ],
    },
  ],
};

function Where() {
  const location = useLocation();
  return <output aria-label="url">{location.pathname + location.search}</output>;
}

function renderView(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <AgendaView />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const lastRange = () => (get.mock.calls.at(-1)?.[1] as { params: unknown }).params;

describe('AgendaView', () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: agenda });
  });

  it('muestra la semana completa, de lunes a domingo, del día pedido', async () => {
    renderView('/agenda?vista=semana&fecha=2026-10-22');
    expect(await screen.findByText('M 123-456')).toBeInTheDocument();
    expect(screen.getByText('Del 19 al 25 de octubre de 2026')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/agenda', {
      params: { from: '2026-10-19T00:00:00-06:00', to: '2026-10-26T00:00:00-06:00' },
    });
    // Viajes y bloqueos de la semana, cada uno con su fecha.
    expect(screen.getByLabelText(/21\/10\/2026 07:00–12:00, Somoto · Ana Martínez, asignado/));
    expect(screen.getByLabelText(/Cambio de frenos, no disponible/)).toBeInTheDocument();
  });

  it('la vista de día pide solo ese día y lo titula con su nombre', async () => {
    renderView('/agenda?vista=dia&fecha=2026-10-21');
    expect(await screen.findByText('Miércoles, 21 de octubre de 2026')).toBeInTheDocument();
    expect(lastRange()).toEqual({
      from: '2026-10-21T00:00:00-06:00',
      to: '2026-10-22T00:00:00-06:00',
    });
    expect(await screen.findByLabelText(/07:00–12:00, Somoto · Ana Martínez, asignado/));
  });

  it('avanza y retrocede una semana, y cambia a la vista de día', async () => {
    renderView('/agenda?vista=semana&fecha=2026-10-22');
    await screen.findByText('M 123-456');

    await userEvent.click(screen.getByRole('button', { name: 'Semana siguiente' }));
    expect(await screen.findByText('Del 26 de octubre al 1 de noviembre de 2026'));
    await waitFor(() =>
      expect(lastRange()).toEqual({
        from: '2026-10-26T00:00:00-06:00',
        to: '2026-11-02T00:00:00-06:00',
      }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(await screen.findByText('Del 19 al 25 de octubre de 2026')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Día' }));
    expect(screen.getByLabelText('url')).toHaveTextContent('/agenda?vista=dia&fecha=2026-10-22');
    expect(await screen.findByText('Jueves, 22 de octubre de 2026')).toBeInTheDocument();
  });

  it('desde la semana, el encabezado de un día lo abre hora por hora', async () => {
    renderView('/agenda?vista=semana&fecha=2026-10-22');
    await screen.findByText('M 123-456');
    await userEvent.click(screen.getByRole('button', { name: 'Ver el día mié 21' }));
    expect(screen.getByLabelText('url')).toHaveTextContent('/agenda?vista=dia&fecha=2026-10-21');
  });

  it('una fecha que no existe en la URL no rompe la agenda: muestra la semana actual', async () => {
    renderView('/agenda?fecha=2026-02-30');
    await screen.findByText('M 123-456');
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeDisabled();
  });

  it('explica los colores y muestra el error de la API', async () => {
    get.mockRejectedValue(new ApiError(503, 'El servicio no está disponible.'));
    renderView('/agenda');
    expect(await screen.findByText('El servicio no está disponible.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Colores de la agenda' })).toBeInTheDocument();
  });
});
