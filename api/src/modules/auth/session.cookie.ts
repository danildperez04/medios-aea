/** Nombre de la cookie con el refresh token del panel (ADR 0003). */
export const REFRESH_COOKIE = 'medios_aea_refresh';

/**
 * Encabezado que exigen refrescar y cerrar sesión. Un formulario o un enlace de otro
 * sitio no puede enviarlo, y el CORS solo deja al panel: defensa CSRF además de
 * `SameSite=Strict`.
 */
export const WEB_CLIENT_HEADER = 'x-medios-client';
export const WEB_CLIENT_VALUE = 'web';

/**
 * Lee una cookie del encabezado `Cookie` sin dependencias. Devuelve undefined si no
 * está o si su valor no se puede decodificar.
 */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim()) || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
