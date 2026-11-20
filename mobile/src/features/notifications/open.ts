import { router } from 'expo-router';
import type { UserRole } from '@/store/session';

/** A quién va un aviso sobre una solicitud, si no es a quien la pidió (API, HU-20). */
export type NoticeAudience = 'DRIVER' | 'FORMER_DRIVER';

export interface NoticeLink {
  reservationId: string | null;
  audience?: string | null;
}

/**
 * A dónde lleva un aviso:
 * - a quien conduce, a su viaje (lo ve tenga el rol que tenga, RN-16);
 * - a quien dejó de conducir, a la bandeja: ya no tiene ese viaje;
 * - a quien pidió (técnico o coordinación), al detalle de su solicitud;
 * - en otro caso, a la bandeja.
 */
export function openNotice(
  { reservationId, audience }: NoticeLink,
  role: UserRole | undefined,
): void {
  if (reservationId && audience === 'DRIVER') {
    router.push(`/trips/${reservationId}`);
  } else if (reservationId && !audience && (role === 'REQUESTER' || role === 'ADMIN')) {
    router.push(`/requests/${reservationId}`);
  } else {
    router.push('/notifications');
  }
}
