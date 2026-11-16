import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatKm,
  formatRange,
  formatTime,
  dateKeyToDate,
  formatWeek,
  formatWeekday,
  isDateKey,
  managuaDateKey,
  managuaRangeFrom,
  mondayOf,
  shiftDateKey,
} from './format';

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

describe('días de calendario para moverse por la agenda', () => {
  it('nombra el día de Managua aunque en UTC ya sea el siguiente', () => {
    // 20/10/2026 21:30 en Managua = 21/10 03:30 UTC.
    expect(managuaDateKey('2026-10-21T03:30:00Z')).toBe('2026-10-20');
  });

  it('solo acepta días reales con forma aaaa-mm-dd', () => {
    expect(isDateKey('2026-10-20')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('20/10/2026')).toBe(false);
    expect(isDateKey('')).toBe(false);
    expect(isDateKey(null)).toBe(false);
  });

  it('suma y resta días cruzando meses y años', () => {
    expect(shiftDateKey('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDateKey('2027-01-01', -1)).toBe('2026-12-31');
    expect(shiftDateKey('2026-10-20', 7)).toBe('2026-10-27');
  });

  it('la semana empieza en lunes, también vista desde un domingo', () => {
    expect(mondayOf('2026-10-19')).toBe('2026-10-19'); // lunes
    expect(mondayOf('2026-10-22')).toBe('2026-10-19'); // jueves
    expect(mondayOf('2026-10-25')).toBe('2026-10-19'); // domingo
  });

  it('el rango cubre días completos de Managua, semiabierto', () => {
    expect(managuaRangeFrom('2026-10-19', 7)).toEqual({
      from: '2026-10-19T00:00:00-06:00',
      to: '2026-10-26T00:00:00-06:00',
    });
    expect(dateKeyToDate('2026-10-19').toISOString()).toBe('2026-10-19T06:00:00.000Z');
  });

  it('titula la semana y nombra los dos meses si los cruza', () => {
    expect(formatWeek('2026-10-19')).toBe('Del 19 al 25 de octubre de 2026');
    expect(formatWeek('2026-11-30')).toBe('Del 30 de noviembre al 6 de diciembre de 2026');
  });

  it('encabeza cada día con su nombre corto y número', () => {
    expect(formatWeekday('2026-10-19T14:00:00Z')).toBe('lun 19');
    expect(formatWeekday('2026-11-01T14:00:00Z')).toBe('dom 1');
  });
});
