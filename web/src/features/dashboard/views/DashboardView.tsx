import { Box, Link, Typography } from '@mui/material';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ApiError } from '@/app/services/api';
import { AgendaBoard, FormError } from '@/design-system/ui';
import { useDrivers } from '@/features/drivers/services/drivers.service';
import { formatDate, formatLongDate, managuaDayRange } from '@/shared/lib/format';
import { useAgenda } from '../services/agenda.service';

/**
 * "Hoy": la agenda del día de todos los medios (RF-16) y los avisos que piden
 * acción (RF-26). Los avisos son frases, no tarjetas de indicadores.
 */
export function DashboardView() {
  const today = useMemo(() => new Date(), []);
  const range = useMemo(() => managuaDayRange(today), [today]);
  const agenda = useAgenda(range);
  const expiring = useDrivers({ page: 1, limit: 5, isActive: true, expiringWithinDays: 30 });

  const rows = agenda.data ?? [];
  const inService = rows.length;
  const inMaintenance = rows.filter((row) =>
    row.blocks.some((block) => block.state === 'UNAVAILABLE' && block.id.startsWith('status-')),
  ).length;

  return (
    <>
      <Box component="header" sx={{ mb: 3 }}>
        <Typography variant="h1">{formatLongDate(today)}</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: '62ch' }}>
          {inService === 0
            ? 'Qué medio está ocupado, por quién y hasta qué hora.'
            : `${inService} ${inService === 1 ? 'medio en servicio' : 'medios en servicio'}${
                inMaintenance ? `, ${inMaintenance} en mantenimiento` : ''
              }.`}
        </Typography>
      </Box>

      <FormError message={agenda.error instanceof ApiError ? agenda.error.message : null} />

      <AgendaBoard
        rows={rows}
        day={today}
        now={today}
        empty={
          agenda.isLoading ? (
            <Typography color="text.secondary">Cargando la agenda…</Typography>
          ) : (
            <Box sx={{ maxWidth: '48ch' }}>
              <Typography sx={{ fontWeight: 600 }}>Todavía no hay medios registrados</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Cuando{' '}
                <Link component={RouterLink} to="/vehiculos">
                  registres el primer vehículo
                </Link>
                , aquí verás cada día sus viajes aprobados, las solicitudes por decidir y los
                bloqueos por mantenimiento.
              </Typography>
            </Box>
          )
        }
      />

      {expiring.data && expiring.data.total > 0 ? (
        <Box component="section" aria-labelledby="avisos" sx={{ mt: 4, maxWidth: '70ch' }}>
          <Typography id="avisos" variant="h6" component="h2" sx={{ mb: 1 }}>
            Licencias por revisar
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {expiring.data.data.map((driver) => (
              <li key={driver.id}>
                <Typography>
                  {driver.licenseStatus === 'EXPIRED'
                    ? `La licencia de ${driver.fullName} venció el ${formatDate(`${driver.licenseExpiry}T12:00:00-06:00`)}; no se le pueden asignar viajes.`
                    : `La licencia de ${driver.fullName} vence el ${formatDate(`${driver.licenseExpiry}T12:00:00-06:00`)}.`}
                </Typography>
              </li>
            ))}
          </Box>
          <Link component={RouterLink} to="/conductores" sx={{ display: 'inline-block', mt: 1 }}>
            Actualizar licencias en Conductores
          </Link>
        </Box>
      ) : null}
    </>
  );
}
