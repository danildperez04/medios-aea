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

  const data = parseBody(await response.text());

  if (!response.ok) {
    // Sin cuerpo JSON el error no es de la API: no dice nada sobre la sesión.
    if (data === NOT_JSON) throw new ApiError(response.status, messageWithoutBody(response.status));
    if (response.status === 401 && token) await useSession.getState().clearSession();
    const body = data as { message?: string; details?: unknown } | undefined;
    throw new ApiError(
      response.status,
      body?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
      body?.details,
    );
  }
  // Un 200 que no es JSON no viene de la API: suele ser el portal de una red wifi.
  if (data === NOT_JSON) {
    throw new ApiError(
      response.status,
      'La respuesta no vino del servidor de Medios AeA. Revisa tu conexión e intenta de nuevo.',
    );
  }
  return data as T;
}

const NOT_JSON = Symbol('not-json');

/** El cuerpo como JSON; `NOT_JSON` si es otra cosa (la página de error de un proxy). */
function parseBody(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return NOT_JSON;
  }
}

/**
 * Mensaje para un error sin cuerpo JSON. Los 502, 503 y 504 los responde el proxy
 * cuando la API está caída o reiniciándose: reintentar más tarde sí sirve.
 */
function messageWithoutBody(status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return 'El servidor no responde en este momento. Intenta de nuevo en unos minutos.';
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
