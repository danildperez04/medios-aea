import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type ApiError } from '@/app/services/api';
import { useAuthStore, type SessionUser } from '@/app/stores/auth.store';
import type { LoginInput, ChangePasswordInput } from '../schemas/auth.schema';

interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SessionUser;
}

/** Inicia sesion y guarda el token en el store (RF-01). */
export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async (input: LoginInput): Promise<LoginResponse> => {
      const { data } = await api.post<LoginResponse>('/auth/login', input);
      return data;
    },
    // Solo el ADMIN usa el panel web; el resto de roles no guarda sesion aqui.
    onSuccess: (data) => {
      if (data.user.role === 'ADMIN') setSession(data.accessToken, data.user);
    },
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
