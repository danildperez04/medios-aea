import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const patch = vi.fn();
vi.mock('@/app/services/api', () => ({
  api: { patch: (...args: unknown[]) => patch(...args) },
  ApiError: class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const { ChangePasswordDialog } = await import('./ChangePasswordDialog');
const { ApiError } = await import('@/app/services/api');
const { useAuthStore } = await import('@/app/stores/auth.store');

const admin = { id: 'a1', email: 'marta@aea.org', fullName: 'Marta', role: 'ADMIN' as const };

function renderDialog(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(['users'], [{ id: 'u1' }]);
  render(
    <QueryClientProvider client={client}>
      <ChangePasswordDialog open onClose={onClose} />
    </QueryClientProvider>,
  );
  return { client, onClose };
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Contraseña actual'), 'ClaveActual123');
  await user.type(screen.getByLabelText('Contraseña nueva'), 'ClaveNueva456');
  await user.type(screen.getByLabelText('Confirmar contraseña nueva'), 'ClaveNueva456');
  await user.click(screen.getByRole('button', { name: 'Cambiar' }));
  return user;
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    patch.mockReset();
    useAuthStore.getState().setSession('token-anterior', admin);
  });

  it('tras el cambio explica que las sesiones se cerraron y lleva a iniciar sesión', async () => {
    patch.mockResolvedValue({ data: { message: 'ok' } });
    const { client, onClose } = renderDialog();
    const user = await fillAndSubmit();

    expect(
      await screen.findByText(/cerramos tus sesiones en todos tus dispositivos/),
    ).toBeVisible();
    expect(patch).toHaveBeenCalledWith('/auth/password', {
      currentPassword: 'ClaveActual123',
      newPassword: 'ClaveNueva456',
    });
    // La sesión sigue en memoria hasta que la persona lo lee y continúa.
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, status: 'anonymous' });
    expect(client.getQueryData(['users'])).toBeUndefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('si la contraseña actual no es correcta, muestra el error y conserva la sesión', async () => {
    patch.mockRejectedValue(new ApiError(400, 'La contraseña actual no es correcta.'));
    renderDialog();
    await fillAndSubmit();

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeVisible();
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });
});
