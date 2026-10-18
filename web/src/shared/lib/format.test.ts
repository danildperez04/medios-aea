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

describe('hourOfDay y formatLongDate', () => {
  it('devuelve la hora decimal en Managua', async () => {
    const { hourOfDay } = await import('./format');
    expect(hourOfDay('2026-10-20T14:30:00Z')).toBe(8.5);
  });

  it('escribe la fecha larga con mayuscula inicial', async () => {
    const { formatLongDate } = await import('./format');
    expect(formatLongDate('2026-10-20T18:00:00Z')).toBe('Martes, 20 de octubre');
  });
});

describe('fechas de formularios en hora de Managua', () => {
  it('convierte un datetime-local a ISO con zona de Managua', async () => {
    const { managuaLocalToIso } = await import('./format');
    expect(managuaLocalToIso('2026-10-20T08:00')).toBe('2026-10-20T08:00:00-06:00');
    expect(new Date(managuaLocalToIso('2026-10-20T08:00')).toISOString()).toBe(
      '2026-10-20T14:00:00.000Z',
    );
  });

  it('precarga un datetime-local con la hora de Managua', async () => {
    const { isoToManaguaLocal } = await import('./format');
    expect(isoToManaguaLocal('2026-10-20T14:00:00Z')).toBe('2026-10-20T08:00');
  });

  it('da el dia completo de Managua, aunque en UTC ya sea el siguiente', async () => {
    const { managuaDayRange } = await import('./format');
    expect(managuaDayRange('2026-10-21T03:00:00Z')).toEqual({
      from: '2026-10-20T00:00:00-06:00',
      to: '2026-10-21T00:00:00-06:00',
    });
  });
});
