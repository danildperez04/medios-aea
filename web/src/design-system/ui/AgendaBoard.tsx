import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { brand } from '@/design-system/theme/theme';
import { formatRange, formatTime, formatWeekday, managuaMidnight } from '@/shared/lib/format';
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
  /**
   * Día que se muestra (cualquier instante de ese día en Managua). Las posiciones
   * se calculan desde su medianoche, así que un bloque de varios días o que empieza
   * antes de `fromHour` se recorta al borde del tablero en lugar de deformarse.
   */
  day?: Date;
  /**
   * Cuántos días seguidos se muestran desde `day` (1 = un día; 7 = una semana). Con
   * varios días, cada uno ocupa una columna con la misma franja `fromHour`–`toHour`.
   */
  days?: number;
  /** Con varios días: al elegir el encabezado de uno (para abrirlo en la vista de día). */
  onDaySelect?: (day: Date) => void;
  /** Hora actual para la línea de "ahora"; solo se dibuja si cae dentro del día. */
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
  day,
  days = 1,
  onDaySelect,
  now = null,
  empty,
}: AgendaBoardProps) {
  const midnight = managuaMidnight(day ?? now ?? new Date()).getTime();
  /** Horas desde la medianoche del primer día mostrado: puede ser < 0 o > 24 × días. */
  const hourOf = (value: string | Date) => (new Date(value).getTime() - midnight) / 3_600_000;
  const span = toHour - fromHour;
  const multiDay = days > 1;
  /**
   * Posición horizontal de una hora. Cada día ocupa una columna del mismo ancho con la
   * franja `fromHour`–`toHour`; la noche no ocupa espacio, así que lo que cae fuera de
   * la franja se pega al borde de su día y un bloque de varios días sigue de largo.
   */
  const toPercent = (hour: number) => {
    if (hour <= 0) return 0;
    if (hour >= days * 24) return 100;
    const dayIndex = Math.floor(hour / 24);
    const inDay = Math.min(Math.max(hour - dayIndex * 24, fromHour), toHour) - fromHour;
    return ((dayIndex * span + inDay) / (days * span)) * 100;
  };
  /** Marcas de la escala, en horas desde la primera medianoche: horas o inicios de día. */
  const ticks = multiDay
    ? Array.from({ length: days + 1 }, (_, i) => (i === days ? days * 24 : i * 24 + fromHour))
    : Array.from({ length: span + 1 }, (_, i) => fromHour + i);
  const nowHour = now ? hourOf(now) : Number.NaN;
  const nowInDay = nowHour - Math.floor(nowHour / 24) * 24;
  const showNow = nowHour >= 0 && nowHour < days * 24 && nowInDay >= fromHour && nowInDay <= toHour;
  const todayIndex = nowHour >= 0 && nowHour < days * 24 ? Math.floor(nowHour / 24) : -1;

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
          {multiDay ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${days}, 1fr)`, height: 30 }}>
              {Array.from({ length: days }, (_, index) => {
                const date = new Date(midnight + index * 86_400_000);
                const label = formatWeekday(date);
                const sx = {
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  pl: 0.75,
                  pt: 1,
                  color: index === todayIndex ? brand.negroLavado : 'text.secondary',
                  fontWeight: index === todayIndex ? 700 : 400,
                } as const;
                return onDaySelect ? (
                  <Box
                    key={index}
                    component="button"
                    type="button"
                    className="tabular"
                    onClick={() => onDaySelect(date)}
                    aria-label={`Ver el día ${label}`}
                    sx={{
                      ...sx,
                      border: 0,
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      '&:hover, &:focus-visible': { textDecoration: 'underline' },
                    }}
                  >
                    {label}
                  </Box>
                ) : (
                  <Box key={index} className="tabular" sx={sx}>
                    {label}
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ position: 'relative', height: 30 }} aria-hidden>
              {ticks.map((hour) => (
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
          )}
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
            <Box sx={{ py: 5, pr: 3, ...gridLines(ticks, toPercent) }}>
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
                    ...gridLines(ticks, toPercent),
                  }}
                >
                  {row.blocks
                    // Lo que no toca la franja visible no se dibuja (ni como rayita en el borde).
                    .filter(
                      (block) => toPercent(hourOf(block.end)) > toPercent(hourOf(block.start)),
                    )
                    .map((block) => {
                      const start = hourOf(block.start);
                      const end = hourOf(block.end);
                      const left = toPercent(start);
                      const width = Math.max(toPercent(end) - left, 1.5);
                      // Con varios días la hora sola no dice de qué día es: va la fecha.
                      const range = multiDay
                        ? formatRange(block.start, block.end)
                        : `${formatTime(block.start)}–${formatTime(block.end)}`;
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
                          {/* Si empezó antes de la franja visible, su hora de inicio no ayuda a leer el tablero. */}
                          {!multiDay && start >= fromHour ? (
                            <Box component="span" className="tabular" sx={{ fontSize: '0.75rem' }}>
                              {formatTime(block.start)}
                            </Box>
                          ) : null}
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
function gridLines(ticks: number[], toPercent: (hour: number) => number) {
  const stops = ticks
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

const LEGEND: AgendaBlockState[] = ['ASSIGNED', 'IN_PROGRESS', 'PENDING', 'UNAVAILABLE'];

/** Qué significa cada color de la agenda. Va debajo del tablero. */
export function AgendaLegend() {
  return (
    <Box
      component="ul"
      aria-label="Colores de la agenda"
      sx={{
        listStyle: 'none',
        m: 0,
        mt: 1.5,
        p: 0,
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: 3,
        rowGap: 1,
        fontSize: '0.825rem',
        color: 'text.secondary',
      }}
    >
      {LEGEND.map((state) => (
        <Box component="li" key={state} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            aria-hidden
            sx={{ width: 22, height: 14, borderRadius: '3px', ...STATE_STYLE[state] }}
          />
          {STATE_LABEL[state].charAt(0).toUpperCase() + STATE_LABEL[state].slice(1)}
        </Box>
      ))}
    </Box>
  );
}
