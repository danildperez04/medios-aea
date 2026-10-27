import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

/** En Testing Library para React Native v14, render y fireEvent son asíncronos. */
function renderLogin() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LoginScreen />
    </QueryClientProvider>,
  );
}

describe('LoginScreen', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  it('valida el formulario antes de llamar a la API', async () => {
    await renderLogin();
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Escribe un correo válido')).toBeTruthy();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de la API cuando las credenciales no son válidas', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ message: 'Correo o contraseña incorrectos.' })),
    });
    await renderLogin();
    await fireEvent.changeText(screen.getByLabelText('Correo'), 'ana@aea.org');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'Clave12345');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Correo o contraseña incorrectos.')).toBeTruthy());
  });
});
