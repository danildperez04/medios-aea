import { describe, expect, it } from 'vitest';
import { RolesGuard } from './jwt-auth.guard.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

/**
 * Pruebas del guard de roles (RF-02).
 *
 * Es una de las piezas de seguridad mas delicadas: si este guard deja pasar a
 * un solicitante hacia un endpoint de administracion, el sistema queda abierto.
 */

type Handler = { name: string; getMetadata: (key: string) => unknown };

function makeContext(options: {
  roles?: UserRole[];
  user?: { role: UserRole; id: number } | null;
}): ExecutionContext {
  const handler: Handler = {
    name: 'test',
    getMetadata: (key: string) => (key === 'roles' ? (options.roles ?? null) : null),
  };
  const cls: Handler = { name: 'test', getMetadata: () => null };

  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({
      getRequest: () => ({ user: options.user ?? undefined }),
    }),
  } as unknown as ExecutionContext;
}

/** Reflector mínimo: devuelve lo que el handler declara. */
function makeReflector(roles: UserRole[] | null) {
  return {
    getAllAndOverride: (key: string) => (key === 'roles' ? roles : undefined),
  };
}

describe('RolesGuard', () => {
  it('permite el paso cuando la ruta no declara roles', () => {
    const guard = new RolesGuard(makeReflector(null) as never);
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('permite el paso al ADMIN en una ruta restringida', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]) as never);
    const context = makeContext({ user: { role: UserRole.ADMIN, id: 1 } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza al REQUESTER en una ruta restringida a ADMIN', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]) as never);
    const context = makeContext({ user: { role: UserRole.REQUESTER, id: 2 } });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('permite el paso al REQUESTER cuando la ruta declara su rol', () => {
    const guard = new RolesGuard(makeReflector([UserRole.REQUESTER]) as never);
    const context = makeContext({ user: { role: UserRole.REQUESTER, id: 2 } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('lanza UnauthorizedException si no hay sesion', () => {
    const guard = new RolesGuard(makeReflector([UserRole.ADMIN]) as never);
    const context = makeContext({ user: null });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
