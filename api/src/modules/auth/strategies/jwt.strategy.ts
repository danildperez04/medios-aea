import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Repository } from 'typeorm';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { User } from '#modules/users/entities/user.entity.js';
import type { JwtPayload } from '../auth.types.js';

/**
 * Estrategia JWT de Passport.
 *
 * Además de la firma y la caducidad, en cada petición comprueba en la base que el
 * usuario siga activo y toma de ahí su rol. Sin esto, una cuenta desactivada seguía
 * entrando hasta que vencía su token (8 h) y un cambio de rol no se aplicaba hasta
 * entonces. También compara la versión de sesión del token con la del usuario, para
 * que cerrar las sesiones tenga efecto de inmediato. Es una consulta por clave primaria con pocas columnas: barata a la
 * escala de la fundación.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(getRepositoryToken(User)) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) throw new UnauthorizedException('Sesión no válida.');
    const user = await this.users.findOne({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        sessionVersion: true,
      },
      where: { id: payload.sub },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException(
        'Tu cuenta fue desactivada o ya no existe. Inicia sesión de nuevo.',
      );
    }
    // Cambió la contraseña o la coordinación cerró sus sesiones después de emitirlo.
    if ((payload.ver ?? 0) !== user.sessionVersion) {
      throw new UnauthorizedException('Tu sesión se cerró. Inicia sesión de nuevo.');
    }
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  }
}
