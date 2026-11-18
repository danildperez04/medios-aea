import { router } from 'expo-router';
import type { UserRole } from '@/store/session';

/**
 * A dónde lleva un aviso. El detalle de una solicitud solo lo pueden abrir quien la
 * pidió y la coordinación; a quien conduce, por ahora, se le muestra la bandeja (sus
 * viajes llegan en el Sprint 5).
 */
export function openNotice(reservationId: string | null, role: UserRole | undefined): void {
  if (reservationId && (role === 'REQUESTER' || role === 'ADMIN')) {
    router.push(`/requests/${reservationId}`);
  } else {
    router.push('/notifications');
  }
}
