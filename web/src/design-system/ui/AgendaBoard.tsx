import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { brand } from '@/design-system/theme/theme';
import { formatTime, hourOfDay } from '@/shared/lib/format';
import { ResourceTag, type ResourceKind } from './ResourceTag';

/**
 * Estado de un bloque en la agenda.
 * - ASSIGNED: asignación aprobada (ocupa el medio).
 * - PENDING: solicitud aún sin decidir (no ocupa, RN-07; se dibuja con trama).
 * - IN_PROGRESS: el viaje o préstamo ya empezó.
 * - UNAVAILABLE: bloqueo (taller, uso administrativo).
 */
export type AgendaBlockState = 'ASSIGNED' | 'PENDING' | 'IN_PROGRESS' | 'UNAVAILABLE';

export interface AgendaBlock {
  id: string;
  start: string | Date;
  end: string | Date;
  state: AgendaBlockState;
  /** Lo que se lee dentro del bloque: destino, motivo del bloqueo. */
  label: string;
}

export interface AgendaRow {
  id: string;
  kind: ResourceKind;
  identifier: string;
  name: string;
  blocks: AgendaBlock[];
}

export interface AgendaBoardProps {
  rows: AgendaRow[];
  /** Primera y última hora visibles (hora de Managua). */
  fromHour?: number;
  toHour?: number;
  /** Hora actual para la línea de "ahora"; se omite si el día mostrado no es hoy. */
  now?: Date | null;
  /** Qué mostrar dentro del tablero cuando no hay filas. */
  empty?: ReactNode;
}

const STATE_LABEL: Record<AgendaBlockState, string> = {
  ASSIGNED: 'asignado',
  PENDING: 'solicitud pendiente',
  IN_PROGRESS: 'en curso',
  UNAVAILABLE: 'no disponible',
};

// Los rellenos cálidos llevan texto negro lavado (≥ 5:1, ver theme.ts).
const hatch = (color: string) =>
  `repeating-linear-gradient(135deg, ${color} 0 6px, transparent 6px 11px)`;

const STATE_STYLE: Record<AgendaBlockState, object> = {
  ASSIGNED: { bgcolor: brand.verde },
  IN_PROGRESS: { bgcolor: brand.naranja },
  PENDING: {
    background: `${hatch(brand.amarillo)}, #FFF6E2`,
    border: `1.5px solid ${brand.amarillo}`,
  },
  UNAVAILABLE: { background: `${hatch('#D9CFC4')}, #FFFFFF`, border: `1.5px solid #CFC5BB` },
};

/** Columna de medios: angosta en el teléfono para dejar ver la línea de tiempo. */
const LABEL_COLUMN = { xs: '136px', sm: '220px' };
const COLUMNS = 'var(--label-col) 1fr';

/**
 * Agenda de los medios: una fila por medio (vehículo, equipo…), el tiempo en
 * horizontal. Sigue el estilo de tablas del manual de marca: fondo crema,
 * filetes finos y cifras en DM Mono.
 *
 * En pantallas angostas la línea de tiempo se desplaza dentro de su propio
 * marco; la columna de medios queda fija a la izquierda.
 */
export function AgendaBoard({
  rows,
  fromHour = 6,
  toHour = 19,
  now = null,
  empty,
}: AgendaBoardProps) {
  const span = toHour - fromHour;
  const hours = Array.from({ length: span + 1 }, (_, i) => fromHour + i);
  const toPercent = (hour: number) =>
    ((Math.min(Math.max(hour, fromHour), toHour) - fromHour) / span) * 100;
  const nowHour = now ? hourOfDay(now) : Number.NaN;
  const showNow = nowHour >= fromHour && nowHour <= toHour;

  return (
    <Box
      sx={{
        bgcolor: brand.crema,
        borderTop: `1px solid ${brand.negroLavado}`,
        borderBottom: `1px solid ${brand.negroLavado}`,
        overflowX: 'auto',
        '--label-col': LABEL_COLUMN,
      }}
    >
      <Box sx={{ minWidth: { xs: 640, sm: 760 }, position: 'relative' }}>
        {/* Escala de horas */}
        <Box sx={{ display: 'grid', gridTemplateColumns: COLUMNS }}>
          <Box sx={{ position: 'sticky', left: 0, bgcolor: brand.crema, zIndex: 2 }} />
          <Box sx={{ position: 'relative', height: 30 }} aria-hidden>
            {hours.map((hour) => (
              <Box
                key={hour}
                className="tabular"
                sx={{
                  position: 'absolute',
                  left: `${toPercent(hour)}%`,
                  transform:
                    hour === fromHour
                      ? 'none'
                      : hour === toHour
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                  top: 8,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                {hour}
              </Box>
            ))}
          </Box>
        </Box>

        {rows.length === 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: COLUMNS,
              borderTop: `1px solid ${brand.linea}`,
            }}
          >
            <Box />
            <Box sx={{ py: 5, pr: 3, ...gridLines(hours, toPercent) }}>
              <Box sx={{ display: 'inline-block', bgcolor: brand.crema, py: 1, pr: 2 }}>
                {empty}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {rows.map((row) => (
              <Box
                component="li"
                key={row.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: COLUMNS,
                  borderTop: `1px solid ${brand.linea}`,
                  minHeight: 56,
                }}
              >
                <Box
                  sx={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    bgcolor: brand.crema,
                    display: 'flex',
                    alignItems: 'center',
                    px: { xs: 1.5, sm: 2 },
                    minWidth: 0,
                  }}
                >
                  <ResourceTag
                    kind={row.kind}
                    identifier={row.identifier}
                    name={row.name}
                    layout="stacked"
                  />
                </Box>
                <Box
                  component="ol"
                  sx={{
                    listStyle: 'none',
                    m: 0,
                    p: 0,
                    position: 'relative',
                    ...gridLines(hours, toPercent),
                  }}
                >
                  {row.blocks.map((block) => {
                    const start = hourOfDay(block.start);
                    const end = hourOfDay(block.end);
                    const left = toPercent(start);
                    const width = Math.max(toPercent(end) - left, 1.5);
                    const range = `${formatTime(block.start)}–${formatTime(block.end)}`;
                    return (
                      <Box
                        component="li"
                        key={block.id}
                        aria-label={`${row.name} ${row.identifier}, ${range}, ${block.label}, ${STATE_LABEL[block.state]}`}
                        title={`${range} · ${block.label}`}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          bottom: 8,
                          left: `${left}%`,
                          width: `${width}%`,
                          borderRadius: '3px',
                          px: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          fontSize: '0.825rem',
                          color: brand.negroLavado,
                          ...STATE_STYLE[block.state],
                        }}
                      >
                        <Box component="span" className="tabular" sx={{ fontSize: '0.75rem' }}>
                          {formatTime(block.start)}
                        </Box>
                        <Box
                          component="span"
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}
                        >
                          {block.label}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {showNow ? <NowLine left={toPercent(nowHour)} /> : null}
      </Box>
    </Box>
  );
}

/** Filetes verticales de cada hora, dibujados como fondo para no crear un nodo por línea. */
function gridLines(hours: number[], toPercent: (hour: number) => number) {
  const stops = hours
    .slice(1, -1)
    .map(
      (hour) =>
        `transparent calc(${toPercent(hour)}% - 0.5px), ${brand.linea} calc(${toPercent(hour)}% - 0.5px), ${brand.linea} calc(${toPercent(hour)}% + 0.5px), transparent calc(${toPercent(hour)}% + 0.5px)`,
    )
    .join(', ');
  return { backgroundImage: `linear-gradient(to right, ${stops})` };
}

/** Línea vertical de la hora actual, encima de la columna de tiempo y bajo la escala. */
function NowLine({ left }: { left: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: 26,
        bottom: 0,
        left: `calc(var(--label-col) + (100% - var(--label-col)) * ${left / 100})`,
        width: '2px',
        ml: '-1px',
        bgcolor: brand.naranjaFuerte,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
