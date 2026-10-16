import { Inject, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { compare, hash } from 'bcrypt';
import { User } from '#modules/users/entities/user.entity.js';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import type { JwtPayload, LoginCredentials } from './auth.types.js';

/**
 * Hash señuelo, para que el login tarde lo mismo exista o no el usuario
 * (evita enumerar cuentas por diferencia de tiempo de respuesta).
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO1sX1FQ7Y6bV6bX0d1bR3sJ0oQe1p0hWa';

/** Respuesta de login: token, datos del usuario y caducidad. */
export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}

/**
 * Servicio de autenticación.
 *
 * - El hash se compara en tiempo constante con `bcrypt.compare` (RF-01, RNF-01).
 * - El mensaje de error es idéntico para usuario inexistente y contraseña
 *   incorrecta: no revela qué cuentas existen.
 * - Se registra `lastLoginAt` para auditoría.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(getRepositoryToken(User)) private readonly users: Repository<User>,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async login(credentials: LoginCredentials): Promise<LoginResult> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('lower(user.email) = lower(:email)', { email: credentials.email.trim() })
      .getOne();

    const invalid = new UnauthorizedException('Correo o contraseña incorrectos.');

    // always-compare: evita revelar por tiempo si el usuario existe.
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const matches = await compare(credentials.password, hashToCompare);
    if (!user || !matches) throw invalid;
    if (!user.isActive) throw new ForbiddenException('La cuenta está desactivada.');

    await this.users.update(user.id, { lastLoginAt: new Date() });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds(),
      user: this.toAuthenticatedUser(user),
    };
  }

  /** Datos del usuario a partir del contenido del token. */
  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.users.findOneBy({ id: userId, isActive: true });
    if (!user) throw new UnauthorizedException('Sesión no válida.');
    return this.toAuthenticatedUser(user);
  }

  /** Cambia la contraseña validando la actual (RF-05). */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException('Sesión no válida.');

    const matches = await compare(currentPassword, user.passwordHash);
    if (!matches) throw new UnauthorizedException('La contraseña actual no es correcta.');

    const passwordHash = await this.hash(newPassword);
    await this.users.update(userId, { passwordHash });
  }

  /** Genera un hash bcrypt con las rondas configuradas (RNF-01). */
  async hash(password: string): Promise<string> {
    return hash(password, this.config.get<number>('BCRYPT_ROUNDS', 12));
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private expiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_EXPIRES_IN', '8h');
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 8 * 3600;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 3600);
  }
}
