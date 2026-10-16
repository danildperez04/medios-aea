import { Card, CardContent, Stack, Typography } from '@mui/material';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  /** Texto pequeno arriba: "Ventas de hoy", "Productos bajo mínimo". */
  label: string;
  /** Valor principal. Para montos, pasar ya formateado con formatMoney. */
  value: string | number;
  /** Texto de apoyo: variación, periodo, detalle. */
  hint?: string;
  /** Icono a la derecha. */
  icon?: LucideIcon;
  /** Color de acento. Por defecto usa el primario. */
  tone?: 'primary' | 'warning' | 'error' | 'neutral';
}

/**
 * Tarjeta de indicador para el dashboard y los encabezados de seccion.
 *
 * El `value` se recibe ya formateado: la tarjeta no decide moneda ni formato,
 * para que cada vista controle como presenta su numero.
 */
export function StatCard({ label, value, hint, icon: Icon, tone = 'primary' }: StatCardProps) {
  const tones = {
    primary: '#2e7d32',
    warning: '#ef6c00',
    error: '#c62828',
    neutral: '#57534e',
  } as const;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {label}
            </Typography>
            <Typography variant="h5" sx={{ color: tones[tone] }} noWrap>
              {value}
            </Typography>
            {hint ? (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            ) : null}
          </Stack>
          {Icon ? <Icon size={28} style={{ color: tones[tone], flexShrink: 0 }} /> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
