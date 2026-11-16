import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reservation, ReservationHistoryEntry } from '../services/reservations.service';

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

const { HistoryDialog } = await import('./HistoryDialog');
const { ApiError } = await import('@/app/services/api');

const reservation = {
  id: 'r1',
  code: 'SOL-2026-00007',
  status: 'CANCELLED',
  destination: 'El Rosario',
  requester: { id: 'u1', fullName: 'Ana Martínez' },
  createdAt: '2026-10-18T13:00:00Z',
} as Reservation;

const entries: ReservationHistoryEntry[] = [
  {
    id: 'h1',
    action: 'APPROVE',
    actor: { id: 'a1', fullName: 'Marta Coordinación' },
    at: '2026-10-19T15:30:00Z',
    detail: 'Asignó Hilux blanca (M 123-456); conduce Ana Martínez.',
  },
  {
    id: 'h2',
    action: 'REASSIGN',
    actor: null,
    at: '2026-10-20T14:00:00Z',
    detail: 'Medio: de Hilux blanca (M 123-456) a Prado (M 777-888).',
  },
  {
    id: 'h3',
    action: 'CANCEL',
    actor: { id: 'u1', fullName: 'Ana Martínez' },
    at: '2026-10-21T16:05:00Z',
    detail: null,
  },
];

function renderDialog(current: Reservation | null = reservation, onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HistoryDialog reservation={current} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

/** Historial de decisiones de una solicitud (HU-15). */
describe('HistoryDialog', () => {
  // Con llaves: si devolviera el mock, Vitest lo ejecutaría como limpieza de cada prueba.
  beforeEach(() => {
    get.mockReset();
  });

  it('muestra en orden quien decidio, cuando (hora de Managua) y que', async () => {
    get.mockResolvedValue({ data: entries });
    renderDialog();

    expect(
      screen.getByRole('heading', { name: 'Historial de SOL-2026-00007' }),
    ).toBeInTheDocument();
    const items = within(await screen.findByRole('list')).getAllByRole('listitem');
    expect(get).toHaveBeenCalledWith('/reservations/r1/history');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Aprobó Marta Coordinación');
    expect(items[0]).toHaveTextContent('19/10/2026 09:30');
    expect(items[0]).toHaveTextContent('Asignó Hilux blanca (M 123-456); conduce Ana Martínez.');
    // Si la cuenta de quien lo hizo ya no existe, se dice en lugar de dejar un hueco.
    expect(items[1]).toHaveTextContent('Reasignó una cuenta eliminada');
    expect(items[2]).toHaveTextContent('Canceló Ana Martínez');
    expect(items[2]).toHaveTextContent('21/10/2026 10:05');
  });

  it('dice que nadie ha decidido cuando no hay registros', async () => {
    get.mockResolvedValue({ data: [] });
    renderDialog();
    expect(
      await screen.findByText('Todavía nadie ha decidido esta solicitud.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('muestra el mensaje de la API si no se puede leer', async () => {
    get.mockRejectedValue(new ApiError(404, 'La solicitud no existe.'));
    renderDialog();
    expect(await screen.findByText('La solicitud no existe.')).toBeInTheDocument();
  });

  it('cerrado no pide nada; abierto se cierra con su boton', async () => {
    renderDialog(null);
    expect(get).not.toHaveBeenCalled();

    get.mockResolvedValue({ data: [] });
    const onClose = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
