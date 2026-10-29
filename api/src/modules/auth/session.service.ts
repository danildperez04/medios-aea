import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, IsNull, type EntityManager } from 'typeorm';
import { User } from '#modules/users/entities/user.entity.js';
import { AuthService, type LoginResult } from './auth.service.js';
import type { LoginCredentials } from './auth.types.js';
import { RefreshToken } from './entities/refresh-token.entity.js';

/**
 * Margen en que un refresh token recién rotado se acepta otra vez: dos pestañas que
 * refrescan a la vez mandan el mismo token y no deben cerrarse la sesión una a otra.
 */
export const REUSE_GRACE_MS = 30_000;

/** Sesión del panel: el token de acceso va en el cuerpo y el refresh token, en la cookie. */
export interface SessionResult extends LoginResult {
  refreshToken: string;
  refreshExpiresAt: Date;
}

/** SHA-256 en hexadecimal: lo único que se guarda del refresh token. */
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Sesión del panel web (ADR 0003). Token de acceso corto que el panel guarda solo en
 * memoria y refresh token opaco, rotado en cada uso y guardado como hash. Si vuelve un
 * token ya rotado fuera del margen de gracia, se revoca su familia: alguien lo copió.
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /** Inicia sesión: mismas reglas que el login de la app (bcrypt, cuenta activa). */
  async start(credentials: LoginCredentials): Promise<SessionResult> {
    const user = await this.auth.authenticate(credentials);
    return this.issue(this.dataSource.manager, user, randomUUID());
  }

  /** Rota el refresh token y entrega un token de acceso nuevo. */
  async refresh(raw: string | undefined): Promise<SessionResult> {
    if (!raw) throw new UnauthorizedException('No hay una sesión abierta. Inicia sesión.');

    // La revocación se hace fuera de la transacción: si se lanzara el error adentro,
    // el rollback la desharía y el token robado seguiría sirviendo.
    const outcome = await this.dataSource.transaction(
      async (manager): Promise<SessionResult | { revoke: string; message: string }> => {
        // FOR UPDATE: dos refresh del mismo token se ordenan y el segundo ve el uso.
        const token = await manager.findOne(RefreshToken, {
          where: { tokenHash: hashRefreshToken(raw) },
          lock: { mode: 'pessimistic_write' },
        });
        const now = new Date();
        if (!token || token.revokedAt || token.expiresAt <= now) {
          throw new UnauthorizedException('Tu sesión venció. Inicia sesión de nuevo.');
        }
        if (token.usedAt && now.getTime() - token.usedAt.getTime() > REUSE_GRACE_MS) {
          return {
            revoke: token.familyId,
            message:
              'Cerramos tu sesión por seguridad: se usó un acceso que ya no era válido. Inicia sesión de nuevo.',
          };
        }
        const user = await manager.findOneBy(User, { id: token.userId });
        if (!user?.isActive) {
          return {
            revoke: token.familyId,
            message: 'Tu cuenta fue desactivada o ya no existe. Inicia sesión de nuevo.',
          };
        }
        if (!token.usedAt) await manager.update(RefreshToken, token.id, { usedAt: now });
        return this.issue(manager, user, token.familyId);
      },
    );

    if ('revoke' in outcome) {
      await this.revokeFamily(this.dataSource.manager, outcome.revoke);
      throw new UnauthorizedException(outcome.message);
    }
    return outcome;
  }

  /** Cierra la sesión: revoca la familia del token. Sin token no hay nada que revocar. */
  async end(raw: string | undefined): Promise<void> {
    if (!raw) return;
    const token = await this.dataSource
      .getRepository(RefreshToken)
      .findOneBy({ tokenHash: hashRefreshToken(raw) });
    if (token) await this.revokeFamily(this.dataSource.manager, token.familyId);
  }

  private async issue(
    manager: EntityManager,
    user: User,
    familyId: string,
  ): Promise<SessionResult> {
    const refreshToken = randomBytes(32).toString('base64url');
    const ttlHours = this.config.get<number>('REFRESH_TOKEN_TTL_HOURS', 12);
    const refreshExpiresAt = new Date(Date.now() + ttlHours * 3_600_000);
    await manager.insert(RefreshToken, {
      userId: user.id,
      familyId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
    });
    const access = await this.auth.issueAccessToken(
      user,
      this.config.get<string>('WEB_ACCESS_TOKEN_TTL', '15m'),
    );
    return { ...access, refreshToken, refreshExpiresAt };
  }

  private async revokeFamily(manager: EntityManager, familyId: string): Promise<void> {
    await manager.update(
      RefreshToken,
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
