import { colors } from '@/lib/theme';
import type { RequestStatus } from './api';

/** Cómo se dice y se pinta cada estado. Texto siempre en negro lavado (contraste). */
export const STATUS: Record<RequestStatus, { label: string; background: string; border: string }> =
  {
    PENDING: { label: 'Pendiente', background: '#FFF6E3', border: colors.amarillo },
    APPROVED: { label: 'Aprobada', background: '#EEF7F2', border: colors.verde },
    REJECTED: { label: 'Rechazada', background: '#FDECEB', border: colors.naranjaFuerte },
    CANCELLED: { label: 'Cancelada', background: '#F4F1EE', border: colors.linea },
    COMPLETED: { label: 'Completada', background: '#EAF4F5', border: colors.turquesaFuerte },
  };

/** Filtros de la lista, en el orden en que se muestran. `null` es "Todas". */
export const STATUS_FILTERS: { value: RequestStatus | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'CANCELLED', label: 'Canceladas' },
  { value: 'COMPLETED', label: 'Completadas' },
];

/** Solo se cancela lo que aún puede ocurrir (RN-13); la API confirma si el viaje inició. */
export function canCancel(status: RequestStatus): boolean {
  return status === 'PENDING' || status === 'APPROVED';
}
