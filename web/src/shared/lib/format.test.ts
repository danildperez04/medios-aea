import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatKm, formatRange, formatTime } from './format';

/**
 * Pruebas de formato (RNF-02): fechas en dd/mm/aaaa y siempre en hora de
 * Managua (UTC-6, sin horario de verano), sin importar la zona del navegador.
 */
describe('formatDate', () => {
  it('usa dd/mm/aaaa', () => {
    expect(formatDate('2026-10-20T18:00:00Z')).toBe('20/10/2026');
  });

  it('convierte a la hora de Managua antes de tomar el dia', () => {
    // 03:00 UTC del 21 son las 21:00 del 20 en Managua.
    expect(formatDate('2026-10-21T03:00:00Z')).toBe('20/10/2026');
  });

  it('devuelve un guion para valores vacios o invalidos', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('no-es-fecha')).toBe('—');
  });
});

describe('formatTime y formatDateTime', () => {
  it('muestra la hora local de Managua en 24 h', () => {
    expect(formatTime('2026-10-20T14:30:00Z')).toBe('08:30');
    expect(formatDateTime('2026-10-20T20:05:00Z')).toBe('20/10/2026 14:05');
  });
});

describe('formatRange', () => {
  it('compacta un rango del mismo dia', () => {
    expect(formatRange('2026-10-20T14:00:00Z', '2026-10-20T18:00:00Z')).toBe(
      '20/10/2026 08:00–12:00',
    );
  });

  it('muestra ambas fechas cuando el rango cruza de dia', () => {
    expect(formatRange('2026-10-20T14:00:00Z', '2026-10-21T23:00:00Z')).toBe(
      '20/10/2026 08:00 – 21/10/2026 17:00',
    );
  });
});

describe('formatKm', () => {
  it('agrega separador de miles y unidad', () => {
    expect(formatKm(12345)).toMatch(/^12.345 km$/);
  });

  it('devuelve un guion sin dato', () => {
    expect(formatKm(null)).toBe('—');
  });
});
