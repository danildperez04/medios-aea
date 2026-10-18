import { describe, expect, it } from 'vitest';
import { calendarDateIn, daysBetween, licenseCovers, licenseStatus } from './calendar.js';

/** Fechas de licencia (RN-09, RF-26), siempre en la zona de Managua (UTC-6). */
describe('calendar', () => {
  it('toma el dia en Managua, no en UTC', () => {
    // 03:00 UTC del 21 son las 21:00 del 20 en Managua.
    expect(calendarDateIn(new Date('2026-10-21T03:00:00Z'))).toBe('2026-10-20');
  });

  it('cuenta los dias entre fechas calendario', () => {
    expect(daysBetween('2026-10-20', '2026-11-19')).toBe(30);
    expect(daysBetween('2026-10-20', '2026-10-19')).toBe(-1);
  });

  describe('licenseStatus', () => {
    const today = new Date('2026-10-20T18:00:00Z');
    it('vigente con mas de 30 dias', () =>
      expect(licenseStatus('2026-12-01', today)).toBe('VALID'));
    it('por vencer dentro de 30 dias', () =>
      expect(licenseStatus('2026-11-19', today)).toBe('EXPIRING'));
    it('vence hoy: todavia sirve, pero avisa', () =>
      expect(licenseStatus('2026-10-20', today)).toBe('EXPIRING'));
    it('vencida desde ayer', () => expect(licenseStatus('2026-10-19', today)).toBe('EXPIRED'));
  });

  describe('licenseCovers', () => {
    it('cubre un viaje que termina el mismo dia del vencimiento', () => {
      expect(licenseCovers('2026-10-20', new Date('2026-10-20T23:00:00Z'))).toBe(true);
    });

    it('no cubre un viaje que termina al dia siguiente', () => {
      expect(licenseCovers('2026-10-20', new Date('2026-10-21T15:00:00Z'))).toBe(false);
    });

    it('un fin exactamente a medianoche de Managua no cuenta como el dia siguiente', () => {
      // 06:00 UTC del 21 = 00:00 del 21 en Managua; el periodo [inicio, fin) termina el 20.
      expect(licenseCovers('2026-10-20', new Date('2026-10-21T06:00:00Z'))).toBe(true);
    });
  });
});
