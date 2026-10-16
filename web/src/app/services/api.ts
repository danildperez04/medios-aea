import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { useAuthStore } from '@/app/stores/auth.store';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

/** Cuerpo de error que devuelve la API. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  path?: string;
  timestamp?: string;
  details?: unknown;
}

/** Error normalizado que consumen los hooks y los formularios. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function extractMessage(error: AxiosError<ApiErrorBody>, fallback: string): string {
  const body = error.response?.data;
  if (body?.message) return body.message;
  if (error.code === 'ERR_NETWORK') {
    return 'No hay conexión con el servidor. Revisa tu red e intenta de nuevo.';
  }
  if (error.code === 'ECONNABORTED') {
    return 'La solicitud tardó demasiado. Intenta de nuevo.';
  }
  return fallback;
}

/**
 * Cliente HTTP único de la aplicación.
 *
 * - Inyecta el token JWT de la sesión en cada petición.
 * - Convierte los errores de Axios en `ApiError`, para que la interfaz siempre
 *   muestre el mensaje que devuelve la API (que ya viene en español y es
 *   accionable) en lugar de un "Network Error" genérico.
 * - Cuando el token expira, limpia la sesión y manda a iniciar sesión.
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
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0;

    if (status === 401) {
      // El token expiro o fue invalidado: se limpia la sesion y el router
      // manda a /login mediante la proteccion de rutas.
      useAuthStore.getState().clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    throw new ApiError(
      status,
      extractMessage(error, 'Ocurrió un error inesperado. Intenta de nuevo.'),
      error.response?.data?.details,
    );
  },
);
