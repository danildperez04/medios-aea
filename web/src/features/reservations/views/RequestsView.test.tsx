import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reservation } from '../services/reservations.service';

const get = vi.fn();
vi.mock('@/app/services/api', () => ({
  api: { get: (...args: unknown[]) => get(...args) },
  ApiError: class ApiError extends Error {},
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
  beforeEach(() => get.mockReset());

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
});
