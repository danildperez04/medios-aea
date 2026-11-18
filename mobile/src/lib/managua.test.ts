import {
  clockTimeFromPicker,
  dateKeyFromPicker,
  formatClockTime,
  formatDateKey,
  managuaDateKey,
  managuaInstant,
  managuaIso,
  pickerValue,
} from './managua';

describe('fechas de Nicaragua', () => {
  it('el día de hoy es el de Managua, no el de UTC', () => {
    // 17/11 a las 23:30 en Managua ya es 18/11 en UTC.
    const now = new Date('2026-11-18T05:30:00Z');
    expect(managuaDateKey(now)).toBe('2026-11-17');
    expect(managuaDateKey(now, 1)).toBe('2026-11-18');
  });

  it('arma la fecha con la zona que exige la API', () => {
    expect(managuaIso('2026-11-18', '07:30')).toBe('2026-11-18T07:30:00-06:00');
    expect(managuaInstant('2026-11-18', '07:30').toISOString()).toBe('2026-11-18T13:30:00.000Z');
  });

  it('dice la fecha y la hora como se leen', () => {
    expect(formatDateKey('2026-11-18')).toBe('miércoles 18 de noviembre');
    expect(formatClockTime('07:05')).toBe('7:05 a. m.');
    expect(formatClockTime('12:00')).toBe('12:00 p. m.');
    expect(formatClockTime('00:15')).toBe('12:15 a. m.');
    expect(formatClockTime('15:30')).toBe('3:30 p. m.');
  });

  it('lo que se elige en el selector del teléfono vuelve igual al formulario', () => {
    const value = pickerValue('2026-12-31', '18:45');
    expect(dateKeyFromPicker(value)).toBe('2026-12-31');
    expect(clockTimeFromPicker(value)).toBe('18:45');
  });
});
