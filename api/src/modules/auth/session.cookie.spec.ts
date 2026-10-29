import { describe, expect, it } from 'vitest';
import { readCookie, REFRESH_COOKIE } from './session.cookie.js';
import { hashRefreshToken } from './session.service.js';

/** Lectura de la cookie de la sesión del panel (ADR 0003). */
describe('readCookie', () => {
  it('encuentra la cookie entre otras', () => {
    expect(readCookie(`a=1; ${REFRESH_COOKIE}=abc_-123; b=2`, REFRESH_COOKIE)).toBe('abc_-123');
  });

  it('no confunde un nombre que la contiene', () => {
    expect(readCookie(`x${REFRESH_COOKIE}=robado`, REFRESH_COOKIE)).toBeUndefined();
  });

  it('sin encabezado, sin la cookie, vacia o mal codificada devuelve undefined', () => {
    expect(readCookie(undefined, REFRESH_COOKIE)).toBeUndefined();
    expect(readCookie('a=1', REFRESH_COOKIE)).toBeUndefined();
    expect(readCookie(`${REFRESH_COOKIE}=`, REFRESH_COOKIE)).toBeUndefined();
    expect(readCookie(`${REFRESH_COOKIE}=%E0%A4%A`, REFRESH_COOKIE)).toBeUndefined();
  });
});

describe('hashRefreshToken', () => {
  it('es SHA-256 en hexadecimal: la base nunca ve el valor', () => {
    const hash = hashRefreshToken('valor-secreto');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('valor-secreto');
    expect(hashRefreshToken('valor-secreto')).toBe(hash);
  });
});
