import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const page = <T,>(data: T[]) => ({
  data: { data, total: data.length, page: 1, limit: 100, totalPages: 1 },
});

const get = vi.fn((url: string, _config?: unknown) =>
  Promise.resolve(
    url === '/users'
      ? page([
          { id: 'u1', fullName: 'Ana Martínez', role: 'REQUESTER' },
          { id: 'u2', fullName: 'Coordinación Logística', role: 'ADMIN' },
          { id: 'u3', fullName: 'José Gutiérrez', role: 'DRIVER' },
        ])
      : page([{ id: 'd3', userId: 'u3', fullName: 'José Gutiérrez' }]),
  ),
);
vi.mock('@/app/services/api', () => ({
  api: { get: (url: string, config?: unknown) => get(url, config) },
  ApiError: class ApiError extends Error {},
}));

const { DriverFormDialog } = await import('./DriverFormDialog');

/** Quién puede tener licencia registrada (HU-26, ADR 0004). */
describe('DriverFormDialog', () => {
  it('ofrece a cualquier persona activa sin licencia, no solo al rol de chofer', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DriverFormDialog open driver={null} onClose={() => {}} />
      </QueryClientProvider>,
    );

    await userEvent.setup().click(await screen.findByRole('combobox', { name: 'Persona' }));
    const options = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Ana Martínez', 'Coordinación Logística']);
    expect(get).toHaveBeenCalledWith('/users', {
      params: expect.not.objectContaining({ role: expect.anything() }),
    });
  });
});
