/**
 * Fechas calendario (sin hora) en la zona de la fundación. Una licencia que vence
 * el 2026-11-02 vale todo ese día en Managua, sin importar la zona del servidor.
 */
export const TIME_ZONE = 'America/Managua';

const DATE_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` del instante dado, en Managua. */
export function calendarDateIn(date: Date): string {
  return DATE_PARTS.format(date);
}

/** Días enteros de `from` a `to` (ambos `YYYY-MM-DD`). Negativo si `to` ya pasó. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export type LicenseStatus = 'VALID' | 'EXPIRING' | 'EXPIRED';

/** Días de aviso antes del vencimiento de una licencia (RF-26). */
export const LICENSE_WARNING_DAYS = 30;

/** Estado de una licencia en una fecha: vence al final del día de `expiry`. */
export function licenseStatus(expiry: string, on: Date = new Date()): LicenseStatus {
  const days = daysBetween(calendarDateIn(on), expiry);
  if (days < 0) return 'EXPIRED';
  if (days <= LICENSE_WARNING_DAYS) return 'EXPIRING';
  return 'VALID';
}

/** ¿La licencia sigue vigente durante todo el periodo que termina en `end`? (RN-09) */
export function licenseCovers(expiry: string, end: Date): boolean {
  // `end` es exclusivo: un viaje que termina a las 00:00 del día siguiente no lo usa.
  const lastInstant = new Date(end.getTime() - 1);
  return daysBetween(calendarDateIn(lastInstant), expiry) >= 0;
}
