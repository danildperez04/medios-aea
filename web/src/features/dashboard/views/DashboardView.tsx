import { Box, Typography } from '@mui/material';
import { AgendaBoard } from '@/design-system/ui';
import { formatLongDate } from '@/shared/lib/format';

/**
 * "Hoy": la agenda del día de todos los medios (RF-16, RF-26).
 *
 * Las filas llegan cuando existan medios registrados y asignaciones (vehículos en
 * el Sprint 2, solicitudes en el 3). Mientras tanto el tablero se muestra vacío y
 * explica qué va a aparecer, sin datos de ejemplo que parezcan reales.
 */
export function DashboardView() {
  const today = new Date();

  return (
    <>
      <Box component="header" sx={{ mb: 3 }}>
        <Typography variant="h1">{formatLongDate(today)}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: '62ch' }}>
          Qué medio está ocupado, por quién y hasta qué hora.
        </Typography>
      </Box>

      <AgendaBoard
        rows={[]}
        now={today}
        empty={
          <Box sx={{ maxWidth: '48ch' }}>
            <Typography sx={{ fontWeight: 600 }}>Todavía no hay medios registrados</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Cuando registres el primer vehículo, aquí verás cada día sus viajes aprobados, las
              solicitudes por decidir y los bloqueos por mantenimiento.
            </Typography>
          </Box>
        }
      />
    </>
  );
}
