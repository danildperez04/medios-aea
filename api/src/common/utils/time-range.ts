import type { ValueTransformer } from 'typeorm';

/**
 * Periodo semiabierto `[start, end)` (RN-03): incluye el inicio y excluye el fin,
 * de modo que un viaje que termina a las 10:00 no choca con otro que empieza a
 * las 10:00. En PostgreSQL se guarda como `tstzrange(start, end, '[)')`.
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/** Literal de rango para PostgreSQL. Las fechas viajan en ISO-8601 con zona. */
export function toRangeLiteral(range: TimeRange): string {
  return `[${range.start.toISOString()},${range.end.toISOString()})`;
}

/**
 * Lee un literal `tstzrange` tal como lo devuelve node-postgres, por ejemplo
 * `["2026-10-20 08:00:00+00","2026-10-20 12:00:00+00")`.
 * Los rangos sin límite (`infinity`) no se usan en este dominio.
 */
export function parseRangeLiteral(literal: string): TimeRange {
  const match = /^[[(]"?([^",]+)"?,"?([^",]+)"?[\])]$/.exec(literal.trim());
  if (!match) throw new Error(`Rango de tiempo no válido: ${literal}`);
  const start = new Date(match[1]);
  const end = new Date(match[2]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Rango de tiempo no válido: ${literal}`);
  }
  return { start, end };
}

/** Dos periodos semiabiertos se solapan si cada uno empieza antes de que el otro termine. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Transformer de TypeORM para columnas `tstzrange`. */
export const timeRangeTransformer: ValueTransformer = {
  to: (value: TimeRange | null | undefined) => (value ? toRangeLiteral(value) : value),
  from: (value: string | null) => (value ? parseRangeLiteral(value) : value),
};
