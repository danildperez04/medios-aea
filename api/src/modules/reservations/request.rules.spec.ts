import { describe, expect, it } from 'vitest';
import { formatRequestCode, requestWindowError } from './request.rules.js';

/** Reglas del horario de una solicitud (RN-06). */
describe('requestWindowError', () => {
  const now = new Date('2026-10-20T14:00:00Z');
  const at = (iso: string) => new Date(iso);

  it('acepta un horario futuro valido', () => {
    expect(
      requestWindowError(at('2026-10-21T14:00:00Z'), at('2026-10-21T18:00:00Z'), now),
    ).toBeNull();
  });

  it('rechaza fin igual o anterior al inicio', () => {
    expect(requestWindowError(at('2026-10-21T14:00:00Z'), at('2026-10-21T14:00:00Z'), now)).toMatch(
      /posterior/,
    );
    expect(requestWindowError(at('2026-10-21T14:00:00Z'), at('2026-10-21T13:00:00Z'), now)).toMatch(
      /posterior/,
    );
  });

  it('rechaza una solicitud que empieza en el pasado', () => {
    expect(requestWindowError(at('2026-10-20T13:00:00Z'), at('2026-10-20T18:00:00Z'), now)).toMatch(
      /pasado/,
    );
  });

  it('tolera unos minutos de desfase de reloj para pedir "ahora"', () => {
    expect(
      requestWindowError(at('2026-10-20T13:57:00Z'), at('2026-10-20T18:00:00Z'), now),
    ).toBeNull();
  });

  it('rechaza una solicitud de mas de 31 dias', () => {
    expect(requestWindowError(at('2026-10-21T00:00:00Z'), at('2026-11-25T00:00:00Z'), now)).toMatch(
      /31 días/,
    );
  });
});

describe('formatRequestCode', () => {
  it('rellena el correlativo a cinco digitos', () => {
    expect(formatRequestCode(2026, 42)).toBe('SOL-2026-00042');
  });
});
