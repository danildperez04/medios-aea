import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { useSession, type SessionUser } from '@/store/session';

export const loginSchema = z.object({
  email: z.string().trim().email('Escribe un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

/** Tiempo que se espera a la API al cerrar sesión antes de seguir sin ella. */
const LOGOUT_TIMEOUT_MS = 5_000;

/** Inicia sesión y guarda los tokens en SecureStore (RF-01, HU-16, HU-28). */
export function useLogin() {
  const setSession = useSession((state) => state.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest<SessionResponse>('/auth/mobile-session', {
        method: 'POST',
        body: input,
        auth: false,
      }),
    onSuccess: (data) =>
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user),
  });
}

/** Perfil del usuario a partir del token guardado. */
export function fetchMe(): Promise<SessionUser> {
  return apiRequest<SessionUser>('/auth/me');
}

/**
 * Cierra la sesión. En el teléfono se cierra siempre y de inmediato; a la API se le
 * pide revocar el refresh token, pero sin señal no se espera ni se reintenta: el token
 * ya no está en el teléfono y vence solo a los 7 días (HU-28).
 */
export async function logout(): Promise<void> {
  const { refreshToken, clearSession } = useSession.getState();
  await clearSession();
  if (!refreshToken) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS);
  try {
    await apiRequest('/auth/mobile-session/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      signal: controller.signal,
    });
  } catch {
    // Sin conexión o con el servidor caído: la sesión local ya está cerrada.
  } finally {
    clearTimeout(timer);
  }
}
