import { create } from 'zustand';
import { tokenStorage } from '@/lib/token-storage';

export type UserRole = 'ADMIN' | 'REQUESTER' | 'DRIVER';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface SessionState {
  /** false mientras se lee el token guardado al abrir la app. */
  ready: boolean;
  token: string | null;
  user: SessionUser | null;
  setSession: (token: string, user: SessionUser) => Promise<void>;
  setUser: (user: SessionUser) => void;
  clearSession: () => Promise<void>;
  markReady: (token: string | null) => void;
}

/** Sesión del usuario. El token persiste en SecureStore; el perfil se pide a /auth/me. */
export const useSession = create<SessionState>()((set) => ({
  ready: false,
  token: null,
  user: null,
  setSession: async (token, user) => {
    await tokenStorage.set(token);
    set({ token, user });
  },
  setUser: (user) => set({ user }),
  clearSession: async () => {
    await tokenStorage.clear();
    set({ token: null, user: null });
  },
  markReady: (token) => set({ ready: true, token }),
}));
