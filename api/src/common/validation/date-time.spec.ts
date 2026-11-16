import { describe, expect, it } from 'vitest';
import { isDateTimeWithOffset } from './date-time.js';

describe('isDateTimeWithOffset', () => {
  it.each([
    '2026-10-22T07:00:00-06:00',
    '2026-10-22T13:00:00Z',
    '2026-10-22T13:00:00.000Z',
    '2026-10-22T07:00-06:00',
    '2026-10-22T18:30:00+05:30',
  ])('acepta %s', (value) => {
    expect(isDateTimeWithOffset(value)).toBe(true);
  });

  it.each([
    ['solo fecha', '2026-10-22'],
    ['sin zona', '2026-10-22T07:00:00'],
    ['sin zona y sin segundos', '2026-10-22T07:00'],
    ['espacio en lugar de T', '2026-10-22 07:00:00-06:00'],
    ['desfase sin dos puntos', '2026-10-22T07:00:00-0600'],
    ['mes inexistente', '2026-13-22T07:00:00-06:00'],
    ['dia inexistente', '2026-02-30T07:00:00-06:00'],
    ['hora inexistente', '2026-10-22T25:00:00-06:00'],
    ['texto', 'mañana'],
    ['vacio', ''],
  ])('rechaza %s', (_case, value) => {
    expect(isDateTimeWithOffset(value)).toBe(false);
  });

  it('rechaza lo que no es texto', () => {
    expect(isDateTimeWithOffset(undefined)).toBe(false);
    expect(isDateTimeWithOffset(null)).toBe(false);
    expect(isDateTimeWithOffset(1792108800000)).toBe(false);
    expect(isDateTimeWithOffset(new Date())).toBe(false);
  });
});
