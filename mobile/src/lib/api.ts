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
  /** false en las rutas de sesión: no llevan token ni disparan una renovación. */
  auth?: boolean;
}

const OFFLINE_MESSAGE = 'No hay conexión con el servidor. Revisa tu red e intenta de nuevo.';
const NOT_JSON = Symbol('not-json');

interface Reply {
  status: number;
  ok: boolean;
  /** El cuerpo como JSON; `NOT_JSON` si es otra cosa (la página de error de un proxy). */
  data: unknown;
}

/** Una petición, sin reintentos. Sin red lanza `ApiError` con estado 0. */
async function send(path: string, options: RequestOptions, token: string | null): Promise<Reply> {
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
    throw new ApiError(0, OFFLINE_MESSAGE);
  }
  return { status: response.status, ok: response.ok, data: parseBody(await response.text()) };
}

/**
 * Cliente HTTP de la app. Adjunta el token y traduce los errores a `ApiError`.
 *
 * Cuando la API rechaza el token de acceso (401), renueva la sesión y repite la
 * petición una vez, sin que la persona lo note (HU-28). Solo un rechazo real del
 * servidor cierra la sesión: sin señal o con el servidor caído, la sesión se conserva.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authenticated = options.auth !== false;
  const token = authenticated ? useSession.getState().token : null;
  let reply = await send(path, options, token);

  if (reply.status === 401 && reply.data !== NOT_JSON && token) {
    // Si otra petición ya renovó mientras esta viajaba, basta con repetirla.
    const renewed =
      useSession.getState().token !== token ? useSession.getState().token : await renewSession();
    if (!renewed) throw toApiError(reply);
    reply = await send(path, options, renewed);
  }

  if (!reply.ok) throw toApiError(reply);
  // Un 200 que no es JSON no viene de la API: suele ser el portal de una red wifi.
  if (reply.data === NOT_JSON) {
    throw new ApiError(
      reply.status,
      'La respuesta no vino del servidor de Medios AeA. Revisa tu conexión e intenta de nuevo.',
    );
  }
  return reply.data as T;
}

interface RenewedSession {
  accessToken: string;
  refreshToken: string;
}

let renewal: Promise<string | null> | null = null;

/**
 * Pide un token de acceso nuevo con el refresh token guardado. Varias peticiones que
 * fallan a la vez comparten una sola renovación: cada una rota el refresh token, y dos
 * en paralelo dejarían a una con un token ya usado.
 *
 * Devuelve el token nuevo, o null si la API rechazó la sesión (y entonces la cierra).
 * Sin conexión, o si el servidor no responde, lanza el error y la sesión se conserva.
 */
export function renewSession(): Promise<string | null> {
  renewal ??= renew().finally(() => {
    renewal = null;
  });
  return renewal;
}

async function renew(): Promise<string | null> {
  const session = useSession.getState();
  if (!session.refreshToken) {
    await session.clearSession();
    return null;
  }
  const reply = await send(
    '/auth/mobile-session/refresh',
    { method: 'POST', body: { refreshToken: session.refreshToken } },
    null,
  );
  if (reply.ok && reply.data !== NOT_JSON) {
    const tokens = reply.data as RenewedSession;
    await useSession
      .getState()
      .setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return tokens.accessToken;
  }
  // 400, 401 y 403 con cuerpo de la API: la sesión venció, se revocó o la cuenta se
  // desactivó. Cualquier otra cosa (502 del proxy, 429, 500) no dice nada de la sesión.
  if (reply.data !== NOT_JSON && [400, 401, 403].includes(reply.status)) {
    await useSession.getState().clearSession();
    return null;
  }
  throw toApiError(reply);
}

function toApiError(reply: Reply): ApiError {
  if (reply.data === NOT_JSON) return new ApiError(reply.status, messageWithoutBody(reply.status));
  const body = reply.data as { message?: string; details?: unknown } | undefined;
  return new ApiError(
    reply.status,
    body?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.',
    body?.details,
  );
}

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
