import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../services/users.service';

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

const { UsersView } = await import('./UsersView');
const { ApiError } = await import('@/app/services/api');
const { useAuthStore } = await import('@/app/stores/auth.store');

const person = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  fullName: 'Ana Martínez',
  email: 'ana@aea.org',
  phone: null,
  role: 'REQUESTER',
  isActive: true,
  lastLoginAt: null,
  createdAt: '2026-10-18T13:00:00Z',
  ...overrides,
});

const marta = person({ id: 'a1', fullName: 'Marta Coordinación', role: 'ADMIN' });

function renderView(rows: User[]) {
  get.mockResolvedValue({
    data: { data: rows, total: rows.length, page: 1, limit: 20, totalPages: 1 },
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UsersView />
    </QueryClientProvider>,
  );
}

describe('UsersView: cerrar sesiones (HU-29)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    useAuthStore.getState().setSession('token', {
      id: marta.id,
      email: marta.email,
      fullName: marta.fullName,
      role: 'ADMIN',
    });
  });

  it('pide confirmación explicando qué pasa, y no cierra nada si se cancela', async () => {
    renderView([person()]);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Cerrar sesiones de Ana Martínez' }),
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/de inmediato las sesiones de Ana Martínez/)).toBeVisible();
    expect(within(dialog).getByText(/Su cuenta sigue activa/)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('al confirmar llama a la API y avisa de que se cerraron', async () => {
    post.mockResolvedValue({ data: { message: 'Se cerraron las sesiones de Ana Martínez.' } });
    renderView([person()]);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Cerrar sesiones de Ana Martínez' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar sesiones' }),
    );

    expect(await screen.findByText('Se cerraron las sesiones de Ana Martínez.')).toBeVisible();
    expect(post).toHaveBeenCalledWith('/users/u1/sessions/revoke');
    // La coordinación sigue en su sesión.
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('si la API falla, el error se ve en el diálogo', async () => {
    post.mockRejectedValue(new ApiError(404, 'El usuario no existe.'));
    renderView([person()]);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Cerrar sesiones de Ana Martínez' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar sesiones' }),
    );
    expect(
      await within(screen.getByRole('dialog')).findByText('El usuario no existe.'),
    ).toBeVisible();
  });

  it('cerrar las propias avisa de que también se cierra esta y lleva a iniciar sesión', async () => {
    post.mockResolvedValue({
      data: { message: 'Se cerraron las sesiones de Marta Coordinación.' },
    });
    renderView([marta]);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', { name: 'Cerrar sesiones de Marta Coordinación' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/también esta/)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar sesiones' }));
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe('anonymous'));
  });

  it('una cuenta desactivada no tiene sesiones que cerrar: no muestra la acción', async () => {
    renderView([person({ isActive: false })]);
    await screen.findByText('Ana Martínez');
    expect(screen.queryByRole('button', { name: /Cerrar sesiones de/ })).toBeNull();
  });
});
