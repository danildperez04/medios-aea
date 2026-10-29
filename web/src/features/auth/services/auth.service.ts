import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ApiError } from '@/app/services/api';
import { endSession, sessionClient, type SessionResponse } from '@/app/services/session';
import { useAuthStore, type SessionUser } from '@/app/stores/auth.store';
import type { LoginInput, ChangePasswordInput } from '../schemas/auth.schema';

/**
 * Inicia la sesión del panel (RF-01, ADR 0003): el token de acceso queda en memoria y
 * la API deja la cookie HttpOnly de refresh. A quien no es ADMIN la API responde 403.
 */
export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async (input: LoginInput): Promise<SessionResponse> => {
      const { data } = await sessionClient.post<SessionResponse>('/auth/session', input);
      return data;
    },
    onSuccess: (data) => setSession(data.accessToken, data.user),
    onError: (error: ApiError) => {
      // Un 401 aqui significa credenciales incorrectas, no sesion expirada:
      // limpiar la sesion no aporta nada y provocaria un bucle de redireccion.
      if (error.status !== 401) clearSession();
    },
  });
}

/** Datos del usuario de la sesion actual. */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async (): Promise<SessionUser> => {
      const { data } = await api.get<SessionUser>('/auth/me');
      return data;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Cambia la contraseña del usuario actual (RF-05). */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ChangePasswordInput): Promise<{ message: string }> => {
      const { data } = await api.patch<{ message: string }>('/auth/password', {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth'] }),
  });
}

/** Cierra la sesión: la API revoca el refresh token y borra la cookie. */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endSession,
    // Los datos en caché eran de esta sesión: no deben verse en la siguiente.
    onSettled: () => queryClient.clear(),
  });
}
