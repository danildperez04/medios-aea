import { Grid, Stack, Typography } from '@mui/material';
import { AlertTriangle, CalendarClock, ClipboardList, Wrench } from 'lucide-react';
import { PageHeader, StatCard } from '@/design-system/ui';

/**
 * Dashboard de la coordinación logística (RF-26).
 *
 * Los indicadores reales llegan en el Sprint 5. Mientras tanto la vista muestra
 * la estructura sin valores, para no presentar como dato lo que aún no existe.
 */
export function DashboardView() {
  return (
    <>
      <PageHeader title="Inicio" description="Resumen de la flota y de las solicitudes" />

      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Solicitudes pendientes"
              value="—"
              hint="Disponible en el Sprint 3"
              icon={ClipboardList}
              tone="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Viajes de hoy"
              value="—"
              hint="Disponible en el Sprint 3"
              icon={CalendarClock}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Vehículos en mantenimiento"
              value="—"
              hint="Disponible en el Sprint 2"
              icon={Wrench}
              tone="neutral"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              label="Licencias por vencer (30 días)"
              value="—"
              hint="Disponible en el Sprint 2"
              icon={AlertTriangle}
              tone="error"
            />
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary">
          Los indicadores se activan por sprint. Consulta <code>docs/04-plan-scrum.md</code>.
        </Typography>
      </Stack>
    </>
  );
}
