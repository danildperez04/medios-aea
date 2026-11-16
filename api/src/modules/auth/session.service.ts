import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, IsNull, type EntityManager } from 'typeorm';
import { UserRole } from '#common/enums/domain.enums.js';
import { User } from '#modules/users/entities/user.entity.js';
import { AuthService, type LoginResult } from './auth.service.js';
import type { LoginCredentials } from './auth.types.js';
import { RefreshToken, type SessionClient } from './entities/refresh-token.entity.js';

/**
 * Margen en que un refresh token recién rotado se acepta otra vez: dos pestañas que
 * refrescan a la vez mandan el mismo token y no deben cerrarse la sesión una a otra.
 */
export const REUSE_GRACE_MS = 30_000;

/**
 * El mismo margen para la app, más largo: con mala señal la respuesta de una renovación
 * se pierde y la app reintenta con el token que ya se rotó. Pasado este tiempo, un token
 * repetido se trata como copiado y se cierra la sesión.
 */
export const MOBILE_REUSE_GRACE_MS = 120_000;

/**
 * Una sesión abierta. El panel recibe el refresh token en una cookie; la app, en el
 * cuerpo, y lo guarda en SecureStore.
 */
export interface SessionResult extends LoginResult {
  refreshToken: string;
  refreshExpiresAt: Date;
}

/** El panel es solo de la coordinación (RF-02): a nadie más se le abre sesión ahí. */
export const PANEL_ONLY_MESSAGE =
  'Este panel es para la coordinación logística. Para pedir un medio o registrar un viaje, usa la app en tu teléfono.';

/** SHA-256 en hexadecimal: lo único que se guarda del refresh token. */
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Sesiones del panel web y de la app móvil (ADR 0003). Token de acceso corto y refresh
 * token opaco, rotado en cada uso y guardado como hash. Si vuelve un token ya rotado
 * fuera del margen de gracia, se revoca su familia: alguien lo copió.
 *
 * Las dos comparten la tabla y el mecanismo; cambian la duración (12 h sin uso el
 * panel, 7 días la app), el margen de gracia y que el panel exige rol ADMIN. Un token
 * solo sirve en las rutas de su cliente.
 */
@Injectable()
export class SessionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /**
   * Inicia sesión: contraseña correcta y cuenta activa. En el panel, además, rol ADMIN,
   * para no dejar una cookie de sesión a quien no lo usa. La app admite cualquier rol:
   * la bitácora de un viaje la registra quien conduce, tenga el rol que tenga (RN-16).
   */
  async start(
    credentials: LoginCredentials,
    client: SessionClient = 'web',
  ): Promise<SessionResult> {
    const user = await this.auth.authenticate(credentials);
    if (client === 'web' && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(PANEL_ONLY_MESSAGE);
    }
    return this.issue(this.dataSource.manager, user, randomUUID(), client);
  }

  /** Rota el refresh token y entrega un token de acceso nuevo. */
  async refresh(raw: string | undefined, client: SessionClient = 'web'): Promise<SessionResult> {
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
        // Un token de la app no abre el panel ni al revés: se trata como desconocido.
        if (!token || token.client !== client || token.revokedAt || token.expiresAt <= now) {
          throw new UnauthorizedException('Tu sesión venció. Inicia sesión de nuevo.');
        }
        const grace = client === 'mobile' ? MOBILE_REUSE_GRACE_MS : REUSE_GRACE_MS;
        if (token.usedAt && now.getTime() - token.usedAt.getTime() > grace) {
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
        // Si le quitaron el rol con la sesión abierta, la sesión del panel termina.
        if (client === 'web' && user.role !== UserRole.ADMIN) {
          return { revoke: token.familyId, message: PANEL_ONLY_MESSAGE };
        }
        if (!token.usedAt) await manager.update(RefreshToken, token.id, { usedAt: now });
        return this.issue(manager, user, token.familyId, client);
      },
    );

    if ('revoke' in outcome) {
      await this.revokeFamily(this.dataSource.manager, outcome.revoke);
      throw new UnauthorizedException(outcome.message);
    }
    return outcome;
  }

  /** Cierra la sesión: revoca la familia del token. Sin token no hay nada que revocar. */
  async end(raw: string | undefined, client: SessionClient = 'web'): Promise<void> {
    if (!raw) return;
    const token = await this.dataSource
      .getRepository(RefreshToken)
      .findOneBy({ tokenHash: hashRefreshToken(raw), client });
    if (token) await this.revokeFamily(this.dataSource.manager, token.familyId);
  }

  private async issue(
    manager: EntityManager,
    user: User,
    familyId: string,
    client: SessionClient,
  ): Promise<SessionResult> {
    const refreshToken = randomBytes(32).toString('base64url');
    // Cada rotación renueva el plazo: la sesión vence tras ese tiempo sin uso.
    const ttlHours =
      client === 'mobile'
        ? this.config.get<number>('MOBILE_REFRESH_TOKEN_TTL_DAYS', 7) * 24
        : this.config.get<number>('REFRESH_TOKEN_TTL_HOURS', 12);
    const refreshExpiresAt = new Date(Date.now() + ttlHours * 3_600_000);
    await manager.insert(RefreshToken, {
      userId: user.id,
      familyId,
      client,
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
