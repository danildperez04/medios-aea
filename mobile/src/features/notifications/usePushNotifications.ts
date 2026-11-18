import { useQueryClient } from '@tanstack/react-query';
import type * as NotificationsModule from 'expo-notifications';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { notificationsModule, pushTarget, registerForPush } from '@/lib/push';
import type { SessionUser } from '@/store/session';
import { openNotice } from './open';

/** Avisos tocados que ya se abrieron: la app no debe abrir el mismo dos veces. */
const opened = new Set<string>();

/**
 * Push en la zona autenticada (HU-19):
 *
 * - registra el teléfono en la API al entrar;
 * - con la app abierta, un aviso nuevo actualiza la bandeja y las solicitudes;
 * - tocar un aviso, aun con la app cerrada, lo marca como leído y abre la solicitud.
 */
export function usePushNotifications(user: SessionUser | null): void {
  const queryClient = useQueryClient();
  const userId = user?.id;
  const role = user?.role;

  useEffect(() => {
    if (userId) void registerForPush();
  }, [userId]);

  useEffect(() => {
    const Notifications = notificationsModule();
    // Sin el módulo (Expo Go en Android) no hay push que escuchar: queda la bandeja.
    if (!userId || !Notifications) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    };
    const open = (response: NotificationsModule.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (opened.has(id)) return;
      opened.add(id);
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const target = pushTarget(response);
      if (target.notificationId) {
        void apiRequest(`/notifications/${target.notificationId}/read`, { method: 'POST' })
          .then(refresh)
          .catch(() => undefined);
      }
      openNotice(target, role);
    };

    const received = Notifications.addNotificationReceivedListener(refresh);
    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    // La app estaba cerrada y se abrió tocando un aviso.
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) open(response);
      })
      .catch(() => undefined);
    return () => {
      received.remove();
      tapped.remove();
    };
  }, [userId, role, queryClient]);
}
