import { Box, Link, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/app/services/api';
import { AgendaBoard, AgendaLegend, Button, FormError, TextField } from '@/design-system/ui';
import {
  dateKeyToDate,
  formatLongDate,
  formatWeek,
  isDateKey,
  managuaDateKey,
  managuaRangeFrom,
  mondayOf,
  shiftDateKey,
} from '@/shared/lib/format';
import { useAgenda } from '../services/agenda.service';

type AgendaMode = 'dia' | 'semana';

const DAYS: Record<AgendaMode, number> = { dia: 1, semana: 7 };

/**
 * Agenda de la flota (RF-16, HU-14): una fila por medio y el tiempo en horizontal, por
 * día o por semana. Muestra viajes aprobados, viajes en curso, solicitudes pendientes
 * con medio preferido y bloqueos.
 *
 * La vista y el día viven en la URL (`?vista=dia&fecha=2026-10-20`): se puede compartir
 * el enlace y el botón Atrás del navegador vuelve al día anterior que se estaba viendo.
 */
export function AgendaView() {
  const [params, setParams] = useSearchParams();
  const now = useMemo(() => new Date(), []);
  const today = managuaDateKey(now);

  const mode: AgendaMode = params.get('vista') === 'dia' ? 'dia' : 'semana';
  const requested = params.get('fecha');
  const selected = isDateKey(requested) ? requested : today;
  const days = DAYS[mode];
  const first = mode === 'semana' ? mondayOf(selected) : selected;

  const range = useMemo(() => managuaRangeFrom(first, days), [first, days]);
  const agenda = useAgenda(range);
  const rows = agenda.data ?? [];

  const show = (nextMode: AgendaMode, date: string) =>
    setParams(date === today && nextMode === 'semana' ? {} : { vista: nextMode, fecha: date });

  const title =
    mode === 'dia'
      ? `${formatLongDate(dateKeyToDate(first))} de ${first.slice(0, 4)}`
      : formatWeek(first);
  const showsToday = today >= first && today < shiftDateKey(first, days);

  return (
    <>
      <Box component="header" sx={{ mb: 2 }}>
        <Typography variant="h1">Agenda</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }} aria-live="polite">
          {title}
        </Typography>
      </Box>

      <Stack
        direction="row"
        sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}
        component="nav"
        aria-label="Moverse por la agenda"
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          aria-label="Vista de la agenda"
          onChange={(_event, next: AgendaMode | null) => {
            if (next) show(next, selected);
          }}
        >
          <ToggleButton value="dia">Día</ToggleButton>
          <ToggleButton value="semana">Semana</ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
          <Button
            variant="outlined"
            size="small"
            aria-label={mode === 'dia' ? 'Día anterior' : 'Semana anterior'}
            onClick={() => show(mode, shiftDateKey(selected, -days))}
            sx={{ minWidth: 40, px: 1 }}
          >
            <ChevronLeft size={18} aria-hidden />
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={showsToday}
            onClick={() => show(mode, today)}
          >
            Hoy
          </Button>
          <Button
            variant="outlined"
            size="small"
            aria-label={mode === 'dia' ? 'Día siguiente' : 'Semana siguiente'}
            onClick={() => show(mode, shiftDateKey(selected, days))}
            sx={{ minWidth: 40, px: 1 }}
          >
            <ChevronRight size={18} aria-hidden />
          </Button>
        </Stack>

        <TextField
          type="date"
          size="small"
          label="Ir a una fecha"
          value={selected}
          onChange={(event) => {
            if (isDateKey(event.target.value)) show(mode, event.target.value);
          }}
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth={false}
          sx={{ width: 170 }}
        />
      </Stack>

      <FormError message={agenda.error instanceof ApiError ? agenda.error.message : null} />

      <AgendaBoard
        rows={rows}
        day={dateKeyToDate(first)}
        days={days}
        now={now}
        onDaySelect={(date) => show('dia', managuaDateKey(date))}
        empty={
          agenda.isLoading ? (
            <Typography color="text.secondary">Cargando la agenda…</Typography>
          ) : agenda.isError ? (
            <Typography color="text.secondary">No se pudo cargar la agenda.</Typography>
          ) : (
            <Box sx={{ maxWidth: '48ch' }}>
              <Typography sx={{ fontWeight: 600 }}>Todavía no hay medios registrados</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Cuando{' '}
                <Link component={RouterLink} to="/vehiculos">
                  registres el primer vehículo
                </Link>
                , aquí verás sus viajes aprobados, las solicitudes por decidir y los bloqueos.
              </Typography>
            </Box>
          )
        }
      />
      <AgendaLegend />

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: '70ch' }}>
        Las solicitudes pendientes aparecen solo si piden un medio en particular; el resto está en{' '}
        <Link component={RouterLink} to="/solicitudes">
          Solicitudes
        </Link>
        .{mode === 'semana' ? ' Elige el encabezado de un día para verlo hora por hora.' : ''}
      </Typography>
    </>
  );
}
