import { describe, expect, it } from 'vitest';
import {
  parseRangeLiteral,
  rangesOverlap,
  timeRangeTransformer,
  toRangeLiteral,
  type TimeRange,
} from './time-range.js';

/**
 * Pruebas de los rangos de tiempo (RN-03).
 *
 * La regla anti-choque descansa en que el sistema y PostgreSQL entiendan el
 * mismo periodo semiabierto. Si esta utilidad se equivoca en un borde, la API
 * rechazaría viajes contiguos legítimos o aceptaría solapes reales.
 */

function range(start: string, end: string): TimeRange {
  return { start: new Date(start), end: new Date(end) };
}

describe('rangesOverlap', () => {
  const base = range('2026-10-20T08:00:00Z', '2026-10-20T12:00:00Z');

  it('detecta un solape parcial', () => {
    expect(rangesOverlap(base, range('2026-10-20T10:00:00Z', '2026-10-20T14:00:00Z'))).toBe(true);
  });

  it('detecta un periodo contenido dentro de otro', () => {
    expect(rangesOverlap(base, range('2026-10-20T09:00:00Z', '2026-10-20T10:00:00Z'))).toBe(true);
  });

  it('detecta periodos identicos', () => {
    expect(rangesOverlap(base, base)).toBe(true);
  });

  it('no considera choque dos viajes contiguos', () => {
    expect(rangesOverlap(base, range('2026-10-20T12:00:00Z', '2026-10-20T15:00:00Z'))).toBe(false);
    expect(rangesOverlap(base, range('2026-10-20T06:00:00Z', '2026-10-20T08:00:00Z'))).toBe(false);
  });

  it('no considera choque periodos separados', () => {
    expect(rangesOverlap(base, range('2026-10-21T08:00:00Z', '2026-10-21T12:00:00Z'))).toBe(false);
  });
});

describe('literales de rango', () => {
  it('genera un rango semiabierto en ISO-8601', () => {
    expect(toRangeLiteral(range('2026-10-20T08:00:00Z', '2026-10-20T12:00:00Z'))).toBe(
      '[2026-10-20T08:00:00.000Z,2026-10-20T12:00:00.000Z)',
    );
  });

  it('lee el formato que devuelve PostgreSQL', () => {
    const parsed = parseRangeLiteral('["2026-10-20 08:00:00+00","2026-10-20 12:00:00+00")');
    expect(parsed.start.toISOString()).toBe('2026-10-20T08:00:00.000Z');
    expect(parsed.end.toISOString()).toBe('2026-10-20T12:00:00.000Z');
  });

  it('respeta la zona horaria del literal', () => {
    const parsed = parseRangeLiteral('["2026-10-20 08:00:00-06","2026-10-20 12:00:00-06")');
    expect(parsed.start.toISOString()).toBe('2026-10-20T14:00:00.000Z');
  });

  it('rechaza un literal mal formado', () => {
    expect(() => parseRangeLiteral('no es un rango')).toThrow(/no válido/);
    expect(() => parseRangeLiteral('["fecha-mala","otra")')).toThrow(/no válido/);
  });

  it('el transformer hace ida y vuelta sin perder precision', () => {
    const original = range('2026-10-20T08:15:00Z', '2026-10-20T12:45:00Z');
    const stored = timeRangeTransformer.to(original) as string;
    const restored = timeRangeTransformer.from(
      stored.replace('[', '["').replace(',', '","').replace(')', '")'),
    ) as TimeRange;
    expect(restored.start.getTime()).toBe(original.start.getTime());
    expect(restored.end.getTime()).toBe(original.end.getTime());
  });

  it('el transformer deja pasar null', () => {
    expect(timeRangeTransformer.to(null)).toBeNull();
    expect(timeRangeTransformer.from(null)).toBeNull();
  });
});
