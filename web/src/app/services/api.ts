import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toApiError, type ApiErrorBody } from './api-error';
import { useAuthStore } from '@/app/stores/auth.store';
import { refreshSession } from './session';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

export { ApiError, type ApiErrorBody } from './api-error';

/**
 * Cliente HTTP único de la aplicación.
 *
 * - Inyecta el token de acceso de la sesión, que vive solo en memoria (ADR 0003).
 * - Convierte los errores de Axios en `ApiError`, para que la interfaz siempre
 *   muestre el mensaje que devuelve la API (que ya viene en español y es
 *   accionable) en lugar de un "Network Error" genérico.
 * - Si el token vence (401), pide uno nuevo con la cookie de refresh y repite la
 *   petición una vez; si ya no hay sesión, manda a iniciar sesión.
 */
export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (status === 401 && original && !original._retried) {
      // El token de acceso dura minutos: se renueva y se repite la petición una vez.
      original._retried = true;
      const token = await refreshSession();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      // Ya no hay sesión: el router manda a /login mediante la protección de rutas.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    throw toApiError(error);
  },
);
