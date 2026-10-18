/**
 * Utilidades de formato para la interfaz (RNF-02, RNF-04).
 *
 * Todas las fechas se muestran en la hora de Nicaragua (America/Managua),
 * sin importar la zona del navegador: una coordinadora que revisa la agenda
 * desde otro país debe ver las mismas horas que el conductor.
 */

export const TIME_ZONE = 'America/Managua';

const DATE_FORMAT = new Intl.DateTimeFormat('es-NI', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const TIME_FORMAT = new Intl.DateTimeFormat('es-NI', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const NUMBER_FORMAT = new Intl.NumberFormat('es-NI', { maximumFractionDigits: 0 });

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formatea una fecha como dd/mm/aaaa. */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? DATE_FORMAT.format(date) : '—';
}

/** Formatea la hora como hh:mm (24 h). */
export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? TIME_FORMAT.format(date) : '—';
}

/** Formatea una fecha con hora: dd/mm/aaaa hh:mm. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? `${formatDate(date)} ${formatTime(date)}` : '—';
}

/**
 * Rango horario compacto. Si inicio y fin caen el mismo día:
 * `20/10/2026 08:00–12:00`; si no: `20/10/2026 08:00 – 21/10/2026 17:00`.
 */
export function formatRange(start: string | Date, end: string | Date): string {
  const a = toDate(start);
  const b = toDate(end);
  if (!a || !b) return '—';
  if (formatDate(a) === formatDate(b)) return `${formatDate(a)} ${formatTime(a)}–${formatTime(b)}`;
  return `${formatDateTime(a)} – ${formatDateTime(b)}`;
}

/** Kilometraje con separador de miles: `12,345 km`. */
export function formatKm(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${NUMBER_FORMAT.format(value)} km`;
}

const HOUR_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Hora decimal en Managua (8:30 → 8.5). Ubica bloques en una línea de tiempo. */
export function hourOfDay(value: string | Date): number {
  const date = toDate(value);
  if (!date) return Number.NaN;
  const parts = HOUR_PARTS.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour + minute / 60;
}

const LONG_DATE = new Intl.DateTimeFormat('es-NI', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** "Sábado 18 de octubre", con mayúscula inicial. */
export function formatLongDate(value: string | Date): string {
  const date = toDate(value);
  if (!date) return '—';
  const text = LONG_DATE.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
