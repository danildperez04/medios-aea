import { create } from 'zustand';
import { tokenStorage, type SessionTokens } from '@/lib/token-storage';

export type UserRole = 'ADMIN' | 'REQUESTER' | 'DRIVER';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface SessionState {
  /** false mientras se leen los tokens guardados al abrir la app. */
  ready: boolean;
  /** Token de acceso: va en cada petición y dura 15 minutos. */
  token: string | null;
  /** Con él se pide otro token de acceso; rota en cada uso (HU-28). */
  refreshToken: string | null;
  user: SessionUser | null;
  setSession: (tokens: SessionTokens, user: SessionUser) => Promise<void>;
  /** Tras una renovación: cambia los tokens y conserva el perfil. */
  setTokens: (tokens: SessionTokens) => Promise<void>;
  setUser: (user: SessionUser) => void;
  clearSession: () => Promise<void>;
  markReady: (tokens: SessionTokens | null) => void;
}

/** Sesión del usuario. Los tokens persisten en SecureStore; el perfil se pide a /auth/me. */
export const useSession = create<SessionState>()((set) => ({
  ready: false,
  token: null,
  refreshToken: null,
  user: null,
  setSession: async (tokens, user) => {
    await tokenStorage.set(tokens);
    set({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user });
  },
  setTokens: async (tokens) => {
    await tokenStorage.set(tokens);
    set({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
  },
  setUser: (user) => set({ user }),
  clearSession: async () => {
    // La memoria primero: aunque el llavero falle, la app ya no usa esos tokens.
    set({ token: null, refreshToken: null, user: null });
    await tokenStorage.clear();
  },
  markReady: (tokens) =>
    set({
      ready: true,
      token: tokens?.accessToken ?? null,
      refreshToken: tokens?.refreshToken ?? null,
    }),
}));
