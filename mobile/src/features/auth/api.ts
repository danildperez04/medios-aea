import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { useSession, type SessionUser } from '@/store/session';

export const loginSchema = z.object({
  email: z.string().trim().email('Escribe un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;

interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

/** Inicia sesión y guarda el token en SecureStore (RF-01, HU-16). */
export function useLogin() {
  const setSession = useSession((state) => state.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => setSession(data.accessToken, data.user),
  });
}

/** Perfil del usuario a partir del token guardado. */
export function fetchMe(): Promise<SessionUser> {
  return apiRequest<SessionUser>('/auth/me');
}
