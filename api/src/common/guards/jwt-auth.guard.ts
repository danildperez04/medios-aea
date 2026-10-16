import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '#common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { UserRole } from '#common/enums/domain.enums.js';

/**
 * Guard de autenticación. Se registra globalmente.
 *
 * Valida el JWT que viaja en `Authorization: Bearer <token>` y adjunta el
 * usuario a la request. Las rutas marcadas con @Public() quedan abiertas.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context) as boolean | Promise<boolean> | Observable<boolean>;
  }
}

/**
 * Guard de autorización por rol.
 *
 * El ADMIN pasa siempre. El resto de roles solo entra a las rutas cuyo @Roles()
 * los incluye; de lo contrario recibe 403 (RF-02).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Sesión no válida.');

    if (user.role === UserRole.ADMIN) return true;
    return requiredRoles.includes(user.role);
  }
}
