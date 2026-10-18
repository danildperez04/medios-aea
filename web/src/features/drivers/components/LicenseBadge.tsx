import { Box } from '@mui/material';
import { brand } from '@/design-system/theme/theme';
import { formatDate } from '@/shared/lib/format';
import type { LicenseStatus } from '../services/drivers.service';

const STYLE: Record<LicenseStatus, { bg: string; border: string }> = {
  VALID: { bg: 'transparent', border: 'transparent' },
  EXPIRING: { bg: brand.amarillo, border: brand.amarillo },
  EXPIRED: { bg: 'transparent', border: brand.naranjaFuerte },
};

/** Vencimiento de la licencia; resalta solo lo que pide acción (RN-09, RF-26). */
export function LicenseBadge({ status, expiry }: { status: LicenseStatus; expiry: string }) {
  // La fecha llega como AAAA-MM-DD; se fija a mediodía para que la zona no cambie el día.
  const date = formatDate(`${expiry}T12:00:00-06:00`);
  const text =
    status === 'EXPIRED' ? `Vencida el ${date}` : status === 'EXPIRING' ? `Vence el ${date}` : date;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: status === 'VALID' ? 0 : 1,
        borderRadius: '3px',
        border: `1.5px solid ${STYLE[status].border}`,
        bgcolor: STYLE[status].bg,
        fontWeight: status === 'VALID' ? 400 : 600,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </Box>
  );
}
