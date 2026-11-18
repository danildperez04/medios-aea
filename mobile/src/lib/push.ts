import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from './api';

type Notifications = typeof NotificationsModule;
let loaded: Notifications | null | undefined;

/**
 * `expo-notifications`, o null donde no se puede usar.
 *
 * En Expo Go para Android, importarlo rompe la app: el paquete carga al importarse el
 * módulo nativo `ExpoTopicSubscriptionModule` (temas de Firebase), que Expo Go no trae
 * desde que quitó el push remoto en el SDK 53. Por eso no se importa arriba sino aquí, y
 * solo fuera de Expo Go en Android. Sin el módulo, la bandeja de avisos sigue funcionando.
 */
export function notificationsModule(): Notifications | null {
  if (loaded !== undefined) return loaded;
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    loaded = null;
    return loaded;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga diferida, ver arriba
    loaded = require('expo-notifications') as Notifications;
  } catch {
    loaded = null;
  }
  return loaded;
}

/** Canal de Android de los avisos; la API lo indica en cada mensaje (`channelId`). */
export const PUSH_CHANNEL = 'avisos';

let registeredToken: string | null = null;

/** Token push de este teléfono, si se registró en esta sesión. Se manda al cerrar sesión. */
export function currentPushToken(): string | null {
  return registeredToken;
}

/** Al cerrar sesión: este teléfono ya no es de esa persona. */
export function forgetPushToken(): void {
  registeredToken = null;
}

/**
 * Cómo se muestran los avisos con la app abierta, y el canal de Android. Se llama una
 * vez al arrancar.
 */
export function configurePush(): void {
  const Notifications = notificationsModule();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(PUSH_CHANNEL, {
      name: 'Avisos de solicitudes',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => undefined);
  }
}

export type PushRegistration =
  | { status: 'registered'; token: string }
  | { status: 'unsupported' | 'denied' | 'unconfigured' | 'failed' };

/**
 * Pide permiso, obtiene el token de Expo de este teléfono y lo registra en la API
 * (RF-20). Nunca lanza: sin push, la bandeja sigue funcionando.
 *
 * - `unsupported`: Expo Go en Android, emulador sin servicios de Google o simulador.
 * - `unconfigured`: falta el projectId de EAS (`eas init`); pasa en Expo Go sin cuenta.
 * - `denied`: la persona no dio permiso.
 * - `failed`: sin red o la API no respondió; se reintenta al volver a abrir la app.
 */
export async function registerForPush(): Promise<PushRegistration> {
  const Notifications = notificationsModule();
  if (!Notifications || !Device.isDevice) return { status: 'unsupported' };
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return { status: 'unconfigured' };

  try {
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiRequest('/notifications/devices', {
      method: 'PUT',
      body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    });
    registeredToken = token;
    return { status: 'registered', token };
  } catch {
    return { status: 'failed' };
  }
}

/** Lo que trae un aviso tocado: a qué solicitud lleva y qué aviso marcar como leído. */
export interface PushTarget {
  notificationId: string | null;
  reservationId: string | null;
  /** `DRIVER` o `FORMER_DRIVER` si el aviso no es para quien pidió (HU-20). */
  audience: string | null;
}

export function pushTarget(response: NotificationsModule.NotificationResponse): PushTarget {
  const data = response.notification.request.content.data as Record<string, unknown> | null;
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
  return {
    notificationId: text(data?.notificationId),
    reservationId: text(data?.reservationId),
    audience: text(data?.audience),
  };
}
