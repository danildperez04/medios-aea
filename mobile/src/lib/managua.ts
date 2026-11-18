/**
 * Fechas y horas de Nicaragua (UTC-6, sin horario de verano). La API exige la zona
 * horaria en cada fecha; se arma a mano para no depender de la zona del teléfono.
 */
export const MANAGUA_OFFSET = '-06:00';
const OFFSET_MS = 6 * 3_600_000;

/** Día del calendario, como `2026-11-18`. */
export type DateKey = string;
/** Hora del reloj, como `07:30`. */
export type ClockTime = string;

const pad = (value: number) => String(value).padStart(2, '0');

/** El día de hoy en Nicaragua, más `days` días. */
export function managuaDateKey(now: Date = new Date(), days = 0): DateKey {
  const local = new Date(now.getTime() - OFFSET_MS + days * 86_400_000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

/** Fecha y hora de Nicaragua con su zona, como la pide la API. */
export function managuaIso(date: DateKey, time: ClockTime): string {
  return `${date}T${time}:00${MANAGUA_OFFSET}`;
}

/** El instante que representa un día y una hora de Nicaragua. */
export function managuaInstant(date: DateKey, time: ClockTime): Date {
  return new Date(managuaIso(date, time));
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** "miércoles 18 de noviembre". Sin `Intl`: no todos los teléfonos lo traen completo. */
export function formatDateKey(date: DateKey): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${day} de ${MONTHS[month - 1]}`;
}

/** "7:30 a. m.", como se dice la hora en Nicaragua. */
export function formatClockTime(time: ClockTime): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'a. m.' : 'p. m.';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${pad(minutes)} ${suffix}`;
}

/** Convierten entre el valor del selector nativo (hora del teléfono) y el formulario. */
export function dateKeyFromPicker(value: Date): DateKey {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}
export function clockTimeFromPicker(value: Date): ClockTime {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
export function pickerValue(date: DateKey, time: ClockTime = '12:00'): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/** Día y hora de Nicaragua de un instante que manda la API. */
export function managuaParts(iso: string): { date: DateKey; time: ClockTime } {
  const local = new Date(new Date(iso).getTime() - OFFSET_MS);
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

/**
 * "miércoles 18 de noviembre, 8:00 a. m. a 12:00 p. m."; si el viaje dura varios días,
 * dice los dos.
 */
export function formatTripWindow(startsAt: string, endsAt: string): string {
  const start = managuaParts(startsAt);
  const end = managuaParts(endsAt);
  if (start.date === end.date) {
    return `${formatDateKey(start.date)}, ${formatClockTime(start.time)} a ${formatClockTime(end.time)}`;
  }
  return `${formatDateKey(start.date)}, ${formatClockTime(start.time)}, al ${formatDateKey(end.date)}, ${formatClockTime(end.time)}`;
}
