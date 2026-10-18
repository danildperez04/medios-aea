import { MAX_RANGE_DAYS } from '#common/dto/time-range-query.dto.js';

/** Margen para relojes desfasados: una solicitud "para ahora" no se rechaza por segundos. */
export const PAST_TOLERANCE_MS = 5 * 60_000;

/**
 * Valida el horario de una solicitud (RN-06). Devuelve el mensaje de error, o
 * null si es válido. Función pura para probarla sin base de datos.
 */
export function requestWindowError(start: Date, end: Date, now: Date = new Date()): string | null {
  if (!(end > start)) return 'La hora de fin debe ser posterior a la de inicio.';
  if (start.getTime() < now.getTime() - PAST_TOLERANCE_MS) {
    return 'La solicitud no puede empezar en el pasado.';
  }
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
    return `Una solicitud no puede durar más de ${MAX_RANGE_DAYS} días.`;
  }
  return null;
}

/** `SOL-2026-00042`: año de la solicitud y correlativo global. */
export function formatRequestCode(year: number, sequence: number): string {
  return `SOL-${year}-${String(sequence).padStart(5, '0')}`;
}
