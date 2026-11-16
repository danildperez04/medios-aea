import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'REQUESTER' | 'DRIVER';

/** Datos del usuario de la sesion actual. */
export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * `checking`: al abrir el panel todavía no se sabe si hay sesión (se pregunta a la
 * API con la cookie); `authenticated` y `anonymous` son la respuesta.
 */
export type SessionStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthState {
  accessToken: string | null;
  user: SessionUser | null;
  status: SessionStatus;
  setSession: (accessToken: string, user: SessionUser) => void;
  clearSession: () => void;
  isAdmin: () => boolean;
}

/**
 * Estado de la sesion (ADR 0003).
 *
 * El token de acceso vive solo en memoria: no se guarda en localStorage, así un XSS
 * no puede llevarse nada que dure más de unos minutos. Recargar la página no cierra
 * la sesión porque el panel pide un token nuevo con la cookie HttpOnly de refresh
 * (`restoreSession`), que JavaScript no puede leer.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  status: 'checking',
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  clearSession: () => set({ accessToken: null, user: null, status: 'anonymous' }),
  isAdmin: () => get().user?.role === 'ADMIN',
}));
