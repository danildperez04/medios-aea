/**
 * Cliente mínimo del servicio push de Expo (RF-20), sin dependencias: un POST con
 * los mensajes y la lectura de los tickets. Documentación:
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo acepta hasta 100 mensajes por petición. */
export const EXPO_BATCH_SIZE = 100;

/** Token que entrega `getExpoPushTokenAsync` en la app. */
export const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: 'default';
  /** Canal de Android que crea la app. */
  channelId: 'avisos';
  priority: 'high';
}

export type TicketOutcome = 'ok' | 'device-gone' | 'error';

interface ExpoTicket {
  status?: 'ok' | 'error';
  details?: { error?: string };
}

/**
 * Qué pasó con cada mensaje, en el mismo orden en que se mandaron. `device-gone`: el
 * teléfono ya no recibe avisos de la app (la desinstalaron o quitaron el permiso) y hay
 * que olvidar el token.
 */
export function readTickets(body: unknown, count: number): TicketOutcome[] {
  const tickets = (body as { data?: ExpoTicket[] } | null)?.data;
  if (!Array.isArray(tickets) || tickets.length !== count) {
    return Array.from({ length: count }, () => 'error');
  }
  return tickets.map((ticket) => {
    if (ticket.status === 'ok') return 'ok';
    return ticket.details?.error === 'DeviceNotRegistered' ? 'device-gone' : 'error';
  });
}

/**
 * Envía un lote. Devuelve un resultado por mensaje; si Expo no responde o responde con
 * error, todos son `error` y se reintentan en la siguiente vuelta.
 */
export async function sendToExpo(
  messages: PushMessage[],
  accessToken: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<TicketOutcome[]> {
  try {
    const response = await fetchImpl(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return messages.map(() => 'error');
    return readTickets(await response.json(), messages.length);
  } catch {
    return messages.map(() => 'error');
  }
}
