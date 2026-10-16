import { Chip, type ChipProps } from '@mui/material';

/** Estados de una solicitud de vehículo (docs/02-prd-mvp-moscow.md §3). */
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

const styles: Record<
  RequestStatus,
  { label: string; color: ChipProps['color']; variant: ChipProps['variant'] }
> = {
  PENDING: { label: 'Pendiente', color: 'warning', variant: 'filled' },
  APPROVED: { label: 'Aprobada', color: 'success', variant: 'filled' },
  REJECTED: { label: 'Rechazada', color: 'error', variant: 'outlined' },
  CANCELLED: { label: 'Cancelada', color: 'default', variant: 'outlined' },
  COMPLETED: { label: 'Completada', color: 'primary', variant: 'outlined' },
};

export interface StatusBadgeProps {
  status: RequestStatus;
  /** Sobrescribe la etiqueta por defecto. */
  label?: string;
}

/**
 * Distintivo del estado de una solicitud.
 *
 * El color nunca es la única señal: cada estado lleva también su texto.
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = styles[status];
  return (
    <Chip size="small" label={label ?? style.label} color={style.color} variant={style.variant} />
  );
}
