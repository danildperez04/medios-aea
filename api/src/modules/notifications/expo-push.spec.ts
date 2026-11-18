import { describe, expect, it, vi } from 'vitest';
import {
  EXPO_PUSH_URL,
  EXPO_TOKEN_PATTERN,
  readTickets,
  sendToExpo,
  type PushMessage,
} from './expo-push.js';

const message = (to: string): PushMessage => ({
  to,
  title: 'Solicitud aprobada',
  body: 'Tu viaje a El Rosario',
  data: { reservationId: 'r1' },
  sound: 'default',
  channelId: 'avisos',
  priority: 'high',
});

describe('push de Expo', () => {
  it('reconoce los tokens que entrega la app y rechaza lo demás', () => {
    expect(EXPO_TOKEN_PATTERN.test('ExponentPushToken[abc_DEF-123]')).toBe(true);
    expect(EXPO_TOKEN_PATTERN.test('ExpoPushToken[abc]')).toBe(true);
    expect(EXPO_TOKEN_PATTERN.test('ExponentPushToken[]')).toBe(false);
    expect(EXPO_TOKEN_PATTERN.test('ExponentPushToken[a b]')).toBe(false);
    expect(EXPO_TOKEN_PATTERN.test('http://evil')).toBe(false);
  });

  it('lee un resultado por mensaje y detecta los teléfonos que ya no existen', () => {
    expect(
      readTickets(
        {
          data: [
            { status: 'ok', id: 't1' },
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
            { status: 'error', details: { error: 'MessageRateExceeded' } },
          ],
        },
        3,
      ),
    ).toEqual(['ok', 'device-gone', 'error']);
  });

  it('si la respuesta no trae un resultado por mensaje, todos se reintentan', () => {
    expect(readTickets({ data: [{ status: 'ok' }] }, 2)).toEqual(['error', 'error']);
    expect(readTickets({ errors: [{ code: 'TOO_MANY' }] }, 1)).toEqual(['error']);
    expect(readTickets(null, 1)).toEqual(['error']);
  });

  it('envía el lote a Expo, con el token de acceso solo si existe', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }] }),
    });
    await expect(
      sendToExpo([message('ExponentPushToken[a]')], 'secreto', fetchImpl as never),
    ).resolves.toEqual(['ok']);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(EXPO_PUSH_URL);
    expect(init.headers.Authorization).toBe('Bearer secreto');
    expect(JSON.parse(init.body)).toEqual([message('ExponentPushToken[a]')]);

    await sendToExpo([message('ExponentPushToken[a]')], undefined, fetchImpl as never);
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('sin red o con error de Expo, todos los mensajes quedan para reintentar', async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      sendToExpo([message('a'), message('b')], undefined, offline as never),
    ).resolves.toEqual(['error', 'error']);
    const down = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(sendToExpo([message('a')], undefined, down as never)).resolves.toEqual(['error']);
  });
});
