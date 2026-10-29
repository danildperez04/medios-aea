import axios, { type AxiosError } from 'axios';
import { useAuthStore, type SessionUser } from '@/app/stores/auth.store';
import { toApiError, type ApiErrorBody } from './api-error';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

/** Clave donde la versión anterior guardaba el token; se borra al arrancar. */
const LEGACY_STORAGE_KEY = 'medios-aea-auth';

/** Respuesta de iniciar o renovar la sesión del panel. */
export interface SessionResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SessionUser;
}

/**
 * Cliente aparte para la sesión: sin los interceptores de `api`, así un 401 del
 * refresh no dispara otro refresh. Envía la cookie y el encabezado que la API exige
 * para refrescar y cerrar sesión (defensa CSRF, ADR 0003).
 */
export const sessionClient = axios.create({
  baseURL,
  timeout: 15_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-Medios-Client': 'web' },
});

// Mismos errores que `api`: la pantalla de ingreso muestra el mensaje de la API.
sessionClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    throw toApiError(error);
  },
);

let inFlight: Promise<string | null> | null = null;

/**
 * Pide un token de acceso nuevo con la cookie de refresh. Si varias peticiones lo
 * necesitan a la vez, comparten una sola llamada: cada refresh rota la cookie, y dos
 * en paralelo desde la misma pestaña serían innecesarios. Devuelve el token, o null si
 * no hay sesión (y la limpia).
 */
export function refreshSession(): Promise<string | null> {
  inFlight ??= sessionClient
    .post<SessionResponse>('/auth/session/refresh')
    .then(({ data }) => {
      useAuthStore.getState().setSession(data.accessToken, data.user);
      return data.accessToken;
    })
    .catch(() => {
      useAuthStore.getState().clearSession();
      return null;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Al abrir el panel: borra el token que dejaba la versión anterior y recupera la sesión. */
export async function restoreSession(): Promise<void> {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Sin acceso a localStorage (modo privado estricto): no había nada que borrar.
  }
  await refreshSession();
}

/** Cierra la sesión en la API (revoca el refresh token) y en memoria. */
export async function endSession(): Promise<void> {
  try {
    await sessionClient.post('/auth/session/logout');
  } finally {
    useAuthStore.getState().clearSession();
  }
}
