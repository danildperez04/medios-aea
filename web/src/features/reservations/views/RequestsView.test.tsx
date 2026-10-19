import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reservation } from '../services/reservations.service';

const get = vi.fn();
const post = vi.fn();
vi.mock('@/app/services/api', () => ({
  api: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
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

const { RequestsView } = await import('./RequestsView');

const reservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 'r1',
  code: 'SOL-2026-00001',
  status: 'PENDING',
  purpose: 'Taller de liderazgo',
  destination: 'El Rosario',
  passengers: 3,
  startsAt: '2026-10-22T13:00:00Z',
  endsAt: '2026-10-22T17:00:00Z',
  resourceType: 'VEHICLE',
  project: { id: 'p1', code: 'PRY-AGUA', name: 'Agua segura' },
  requester: { id: 'u1', fullName: 'Ana Martínez' },
  preferredResource: null,
  rejectionReason: null,
  decidedAt: null,
  createdAt: '2026-10-18T13:00:00Z',
  ...overrides,
});

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RequestsView />
    </QueryClientProvider>,
  );
}

describe('RequestsView', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  const page = (rows: Reservation[]) => ({
    data: { data: rows, total: rows.length, page: 1, limit: 20, totalPages: 1 },
  });

  it('pide por defecto las solicitudes por decidir', async () => {
    get.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 20, totalPages: 0 } });
    renderView();
    await screen.findByText('No hay solicitudes por decidir');
    expect(get).toHaveBeenCalledWith('/reservations', {
      params: expect.objectContaining({ status: 'PENDING' }),
    });
  });

  it('muestra horario en hora de Managua, solicitante, proyecto y medio preferido', async () => {
    get.mockResolvedValue({
      data: {
        data: [
          reservation(),
          reservation({
            id: 'r2',
            code: 'SOL-2026-00002',
            requester: { id: 'u2', fullName: 'Carlos Rivera' },
            preferredResource: { id: 'v1', name: 'Hilux blanca', identifier: 'M 123-456' },
          }),
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });
    renderView();
    expect(await screen.findByText('Ana Martínez')).toBeInTheDocument();
    expect(screen.getAllByText('22/10/2026 07:00–11:00')).toHaveLength(2);
    expect(screen.getAllByText('PRY-AGUA')).toHaveLength(2);
    expect(screen.getByText('Cualquiera')).toBeInTheDocument();
    expect(screen.getByText('M 123-456')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente')).toHaveLength(2);
  });

  it('solo ofrece cancelar las pendientes y aprobadas (HU-10)', async () => {
    get.mockResolvedValue(
      page([
        reservation(),
        reservation({ id: 'r2', code: 'SOL-2026-00002', status: 'APPROVED' }),
        reservation({ id: 'r3', code: 'SOL-2026-00003', status: 'COMPLETED' }),
      ]),
    );
    renderView();
    await screen.findAllByText('Ana Martínez');
    expect(screen.getByLabelText('Cancelar la solicitud SOL-2026-00001')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancelar la solicitud SOL-2026-00002')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cancelar la solicitud SOL-2026-00003')).toBeNull();
  });

  it('confirma antes de cancelar y avisa que se libera el medio de una aprobada', async () => {
    get.mockResolvedValue(page([reservation({ status: 'APPROVED' })]));
    post.mockResolvedValue({ data: reservation({ status: 'CANCELLED' }) });
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByLabelText('Cancelar la solicitud SOL-2026-00001'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/quedarán libres/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar solicitud' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/reservations/r1/cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('muestra en el dialogo el motivo si la API no deja cancelar', async () => {
    const { ApiError } = await import('@/app/services/api');
    get.mockResolvedValue(page([reservation({ status: 'APPROVED' })]));
    post.mockRejectedValue(new ApiError(409, 'El viaje ya inició; no se puede cancelar.'));
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByLabelText('Cancelar la solicitud SOL-2026-00001'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar solicitud' }));
    expect(await within(dialog).findByText(/ya inició/)).toBeInTheDocument();
  });
});
