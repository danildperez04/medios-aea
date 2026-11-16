import type { UserRole } from '#common/enums/domain.enums.js';

/**
 * Tipos de autenticacion compartidos entre el servicio y la estrategia JWT.
 * Se separan para que la estrategia no dependa del servicio.
 */

/** Credenciales de inicio de sesion. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Contenido que viaja dentro del JWT. */
export interface JwtPayload {
  /** id (uuid) del usuario */
  sub: string;
  email: string;
  fullName: string;
  role: UserRole;
  /**
   * `session_version` del usuario al emitir el token. Si ya no coincide, el token se
   * rechaza. Los tokens anteriores a este campo no lo traen y cuentan como 0.
   */
  ver?: number;
}
