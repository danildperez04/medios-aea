import { API_URL } from './config';
import { useSession } from '@/store/session';

/** Error normalizado con el mensaje en español que devuelve la API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Cliente HTTP de la app. Adjunta el token, traduce los errores a `ApiError`
 * y cierra la sesión si la API responde 401 (token vencido o revocado).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = useSession.getState().token;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu red e intenta de nuevo.');
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    if (response.status === 401 && token) await useSession.getState().clearSession();
    const body = data as { message?: string; details?: unknown } | undefined;
    throw new ApiError(
      response.status,
      body?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
      body?.details,
    );
  }
  return data as T;
}
