import { Box } from '@mui/material';
import { brand } from '@/design-system/theme/theme';
import { STATUS_LABELS } from '../schemas/vehicle.schema';
import type { ResourceStatus } from '../services/vehicles.service';

const DOT: Record<ResourceStatus, { fill: string; border: string }> = {
  AVAILABLE: { fill: brand.verde, border: brand.verde },
  MAINTENANCE: { fill: brand.amarillo, border: '#D9A43A' },
  INACTIVE: { fill: 'transparent', border: brand.tintaSuave },
};

/** Estado operativo de un medio, con texto y no solo color. */
export function ResourceStatusBadge({ status }: { status: ResourceStatus }) {
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, whiteSpace: 'nowrap' }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          bgcolor: DOT[status].fill,
          border: `1.5px solid ${DOT[status].border}`,
        }}
      />
      {STATUS_LABELS[status]}
    </Box>
  );
}
