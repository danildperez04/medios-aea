import { Box } from '@mui/material';
import { brand } from '@/design-system/theme/theme';

/** Estados de una solicitud (docs/02-prd-mvp-moscow.md §3). */
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

/**
 * Colores de marca por estado. Los rellenos cálidos llevan texto negro lavado
 * (≥ 5:1); los estados cerrados van solo con borde para no competir con los
 * que piden atención.
 */
const styles: Record<RequestStatus, { label: string; bg: string; border: string }> = {
  PENDING: { label: 'Pendiente', bg: brand.amarillo, border: brand.amarillo },
  APPROVED: { label: 'Aprobada', bg: brand.verde, border: brand.verde },
  COMPLETED: { label: 'Completada', bg: 'transparent', border: brand.negroLavado },
  REJECTED: { label: 'Rechazada', bg: 'transparent', border: brand.naranjaFuerte },
  CANCELLED: { label: 'Cancelada', bg: 'transparent', border: brand.linea },
};

export interface StatusBadgeProps {
  status: RequestStatus;
  label?: string;
}

/** Estado de una solicitud. El color nunca es la única señal: siempre lleva texto. */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = styles[status];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.125,
        borderRadius: '3px',
        border: `1.5px solid ${style.border}`,
        bgcolor: style.bg,
        color: 'text.primary',
        fontSize: '0.8rem',
        fontWeight: 600,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? style.label}
    </Box>
  );
}

/** Activo / inactivo para usuarios, proyectos y medios. */
export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontSize: '0.875rem',
        color: active ? 'text.primary' : 'text.secondary',
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: active ? brand.verde : 'transparent',
          border: `1.5px solid ${active ? brand.verde : brand.tintaSuave}`,
        }}
      />
      {active ? 'Activo' : 'Inactivo'}
    </Box>
  );
}
