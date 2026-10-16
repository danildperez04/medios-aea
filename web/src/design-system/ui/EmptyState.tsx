import { Box, Stack, Typography } from '@mui/material';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Accion opcional: "Crear producto", "Reintentar". */
  action?: React.ReactNode;
}

/**
 * Estado vacio.
 *
 * Nunca se deja una tabla en blanco sin explicacion: un filtro sin resultados
 * y una base recien creada son situations distintas y se explican distinto.
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        {Icon ? <Icon size={40} style={{ color: '#a8a29e' }} /> : null}
        <Typography variant="h6">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {description}
          </Typography>
        ) : null}
        {action}
      </Stack>
    </Box>
  );
}
