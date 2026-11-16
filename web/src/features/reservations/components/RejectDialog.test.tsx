import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reservation } from '../services/reservations.service';

const post = vi.fn();
vi.mock('@/app/services/api', () => ({
  api: { post: (url: string, body?: unknown) => post(url, body) },
  ApiError: class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const { RejectDialog } = await import('./RejectDialog');

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
  requester: { id: 'u1', fullName: 'Carlos Rivera' },
  preferredResource: null,
  proposedDriver: null,
  assignment: null,
  rejectionReason: null,
  decidedAt: null,
  createdAt: '2026-10-18T13:00:00Z',
};

function renderDialog(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RejectDialog reservation={reservation} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
}

/** Rechazar con motivo desde la bandeja (HU-12). */
describe('RejectDialog', () => {
  // Con llaves: si devolviera el mock, Vitest lo llamaría como limpieza al terminar.
  beforeEach(() => {
    post.mockReset();
  });

  it('no envia sin motivo (PT-22) y avisa cuanto falta', async () => {
    renderDialog();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Motivo'), 'no');
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(screen.getByText('Explica el motivo con al menos 5 caracteres.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('envia el motivo recortado y cierra', async () => {
    post.mockResolvedValue({ data: { ...reservation, status: 'REJECTED' } });
    const onClose = renderDialog();
    const user = userEvent.setup();
    expect(screen.getByText('Carlos Rivera lo recibirá en su aviso (0/300).')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Motivo'), '  Se cruza con la feria  ');
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/reservations/r1/reject', {
        reason: 'Se cruza con la feria',
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('muestra el motivo si la API no deja rechazar', async () => {
    const { ApiError } = await import('@/app/services/api');
    post.mockRejectedValue(new ApiError(409, 'La solicitud ya no está pendiente.'));
    renderDialog();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Motivo'), 'Se cruza con la feria');
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(await screen.findByText('La solicitud ya no está pendiente.')).toBeInTheDocument();
  });
});
