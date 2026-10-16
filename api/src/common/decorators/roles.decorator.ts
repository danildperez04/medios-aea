import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { UserRole } from '#common/enums/domain.enums.js';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles indicados.
 * El control real lo hace RolesGuard en el servidor: ocultar un botón en la
 * interfaz es conveniencia, no seguridad (RF-02).
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
