import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApprovalOptions, Reservation } from '../services/reservations.service';

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

const { ApproveDialog } = await import('./ApproveDialog');

const hilux = { id: 'v1', name: 'Hilux blanca', identifier: 'M 123-456', passengerCapacity: 4 };
const prado = { id: 'v2', name: 'Prado gris', identifier: 'M 789-012', passengerCapacity: 6 };
const ana = { id: 'd1', fullName: 'Ana Martínez' };
const jose = { id: 'd2', fullName: 'José Gutiérrez' };

const reservation: Reservation = {
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
  preferredResource: { id: hilux.id, name: hilux.name, identifier: hilux.identifier },
  proposedDriver: ana,
  assignment: null,
  rejectionReason: null,
  decidedAt: null,
  createdAt: '2026-10-18T13:00:00Z',
};

function options(overrides: Partial<ApprovalOptions> = {}) {
  const value: ApprovalOptions = {
    resources: { available: [hilux, prado], unavailable: [] },
    drivers: { available: [ana, jose], unavailable: [] },
    ...overrides,
  };
  get.mockImplementation((url: string) =>
    Promise.resolve({ data: url === '/availability' ? value.resources : value.drivers }),
  );
}

function renderDialog(
  onClose = vi.fn(),
  props: Partial<React.ComponentProps<typeof ApproveDialog>> = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ApproveDialog reservation={reservation} onClose={onClose} {...props} />
    </QueryClientProvider>,
  );
  return onClose;
}

/** Aprobar desde la bandeja (HU-11, ADR 0004). */
describe('ApproveDialog', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('pide los libres del horario y marca el preferido y el propuesto', async () => {
    options();
    post.mockResolvedValue({ data: { ...reservation, status: 'APPROVED' } });
    const onClose = renderDialog();

    expect(await screen.findByText('Propuesto por Ana Martínez.')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/availability', {
      params: expect.objectContaining({ from: reservation.startsAt, passengers: 3 }),
    });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aprobar' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/reservations/r1/approve', {
        resourceId: hilux.id,
        driverId: ana.id,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('avisa a quien cambia si la coordinacion elige a otra persona', async () => {
    options();
    renderDialog();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('combobox', { name: 'Conduce' }));
    await user.click(within(screen.getByRole('listbox')).getByText('José Gutiérrez'));
    expect(screen.getByText('Se avisará a Ana Martínez y José Gutiérrez.')).toBeInTheDocument();
  });

  it('si el propuesto no puede, dice por que y no deja aprobar sin elegir', async () => {
    options({
      drivers: { available: [jose], unavailable: [{ driver: ana, reasons: ['BUSY'] }] },
    });
    renderDialog();

    expect(
      await screen.findByText(
        'Ana Martínez, propuesto, ya conduce otro viaje en ese horario. Elige a otra persona.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeDisabled();
  });

  it('sin medios libres lo dice en lugar de ofrecer una lista vacia', async () => {
    options({
      resources: { available: [], unavailable: [{ resource: hilux, reasons: ['BUSY'] }] },
    });
    renderDialog();
    expect(await screen.findByText(/No hay medios libres para ese horario/)).toBeInTheDocument();
  });

  it('muestra el motivo si la API no deja aprobar', async () => {
    const { ApiError } = await import('@/app/services/api');
    options();
    post.mockRejectedValue(new ApiError(409, 'Hilux blanca ya tiene un viaje aprobado.'));
    renderDialog();

    await screen.findByText('Propuesto por Ana Martínez.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(await screen.findByText('Hilux blanca ya tiene un viaje aprobado.')).toBeInTheDocument();
  });

  describe('reasignar (HU-13)', () => {
    // Aprobada con la Hilux y José: la disponibilidad los da por ocupados (este mismo viaje).
    const approved: Reservation = {
      ...reservation,
      status: 'APPROVED',
      requester: { id: 'u2', fullName: 'Carlos Rivera' },
      assignment: {
        id: 'a1',
        resource: { id: hilux.id, name: hilux.name, identifier: hilux.identifier },
        driver: jose,
      },
    };
    const busyOwn = () =>
      options({
        resources: { available: [prado], unavailable: [{ resource: hilux, reasons: ['BUSY'] }] },
        drivers: { available: [ana], unavailable: [{ driver: jose, reasons: ['BUSY'] }] },
      });

    it('marca lo actual aunque figure ocupado y no deja enviar sin cambios', async () => {
      busyOwn();
      renderDialog(vi.fn(), { reservation: approved, mode: 'reassign' });

      expect(await screen.findByText('Reasignar SOL-2026-00001')).toBeInTheDocument();
      expect(
        await screen.findByText(/Hilux blanca · M 123-456 · 4 pasajeros \(asignado\)/),
      ).toBeInTheDocument();
      expect(screen.getByText('José Gutiérrez (asignado)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reasignar' })).toBeDisabled();
      expect(screen.getByText('Se avisará a Carlos Rivera y José Gutiérrez.')).toBeInTheDocument();
    });

    it('envia solo lo que cambia y avisa a quien deja de conducir', async () => {
      busyOwn();
      post.mockResolvedValue({ data: approved });
      const onClose = renderDialog(vi.fn(), { reservation: approved, mode: 'reassign' });
      const user = userEvent.setup();

      await user.click(await screen.findByRole('combobox', { name: 'Conduce' }));
      await user.click(within(screen.getByRole('listbox')).getByText('Ana Martínez'));
      expect(
        screen.getByText('Se avisará a Carlos Rivera, José Gutiérrez y Ana Martínez.'),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Reasignar' }));
      await waitFor(() =>
        expect(post).toHaveBeenCalledWith('/reservations/r1/reassign', { driverId: ana.id }),
      );
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });
  });
});
