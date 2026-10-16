import { describe, expect, it, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { User } from '#modules/users/entities/user.entity.js';
import { UserRole } from '#common/enums/domain.enums.js';

/**
 * Pruebas del servicio de autenticacion (RF-01, RF-05, RNF-01).
 *
 * Se verifica el comportamiento observable, no la llamada a bcrypt: el hash es
 * un detalle de implementacion. Lo que importa es que una contraseña correcta
 * entre, una incorrecta no, y que una cuenta desactivada no pueda entrar.
 */

interface UserOverrides {
  id?: string;
  email?: string;
  passwordHash?: string;
  isActive?: boolean;
  role?: UserRole;
}

const ADMIN_ID = '0b9c7f0e-6d2a-4c3e-9a51-6f7e2b1d0001';

/** bcrypt de "ClaveCorrecta123" con 4 rondas, para que las pruebas sean rapidas. */
const HASH_VALIDO = '$2b$04$0Ah5yM5HvZHwJdbmDd1khOR./o.OJCE/cAhaYI3r/cleh48qYsyvG';
const HASH_SENO = '$2b$04$m5A.1zhnOr7nocHB0KpG/.aWoBUm80kXrmnB3aatXXEtqVNv7s8Fy';

function buildUser(overrides: UserOverrides = {}): User {
  return Object.assign(new User(), {
    id: ADMIN_ID,
    email: 'logistica@ayudaenaccion.org',
    phone: null,
    passwordHash: HASH_VALIDO,
    fullName: 'Coordinación Logística',
    role: UserRole.ADMIN,
    isActive: true,
    lastLoginAt: null,
    ...overrides,
  });
}

describe('AuthService', () => {
  let service: AuthService;
  let findOneBy: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let signAsync: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    findOneBy = vi.fn();
    update = vi.fn().mockResolvedValue({ affected: 1 });
    signAsync = vi.fn().mockResolvedValue('token-fake');

    const userRepository = {
      findOneBy,
      update,
      createQueryBuilder: vi.fn(() => ({
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: findOneBy,
      })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: JwtService, useValue: { signAsync } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: unknown) => {
              // El setup de pruebas baja BCRYPT_ROUNDS a 4 para acelerar los hashes.
              if (key === 'BCRYPT_ROUNDS') return 4;
              return fallback;
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('devuelve token y datos del usuario con credenciales correctas', async () => {
      findOneBy.mockResolvedValue(buildUser());

      const result = await service.login({
        email: 'logistica@ayudaenaccion.org',
        password: 'ClaveCorrecta123',
      });

      expect(result.accessToken).toBe('token-fake');
      expect(result.tokenType).toBe('Bearer');
      expect(result.user.email).toBe('logistica@ayudaenaccion.org');
      expect(result.user.role).toBe(UserRole.ADMIN);
    });

    it('nunca expone el hash de la contraseña', async () => {
      findOneBy.mockResolvedValue(buildUser());

      const result = await service.login({
        email: 'logistica@ayudaenaccion.org',
        password: 'ClaveCorrecta123',
      });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain(HASH_VALIDO);
    });

    it('rechaza una contraseña incorrecta', async () => {
      findOneBy.mockResolvedValue(buildUser({ passwordHash: HASH_SENO }));

      await expect(
        service.login({ email: 'logistica@ayudaenaccion.org', password: 'ClaveEquivocada999' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza un usuario inexistente', async () => {
      findOneBy.mockResolvedValue(null);

      await expect(
        service.login({ email: 'fantasma@ayudaenaccion.org', password: 'ClaveCorrecta123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('da el mismo mensaje para usuario inexistente y contraseña incorrecta', async () => {
      // Distinguir los dos casos permite enumerar que correos existen.
      findOneBy.mockResolvedValue(null);
      const errorInexistente = await service
        .login({ email: 'fantasma@ayudaenaccion.org', password: 'ClaveCorrecta123' })
        .catch((e: unknown) => e);

      findOneBy.mockResolvedValue(buildUser({ passwordHash: HASH_SENO }));
      const errorIncorrecta = await service
        .login({ email: 'logistica@ayudaenaccion.org', password: 'ClaveEquivocada999' })
        .catch((e: unknown) => e);

      expect((errorInexistente as Error).message).toBe((errorIncorrecta as Error).message);
    });

    it('rechaza una cuenta desactivada aunque la contraseña sea correcta', async () => {
      findOneBy.mockResolvedValue(buildUser({ isActive: false }));

      await expect(
        service.login({ email: 'logistica@ayudaenaccion.org', password: 'ClaveCorrecta123' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('registra el momento del ultimo acceso', async () => {
      findOneBy.mockResolvedValue(buildUser({ id: 'user-7' }));

      await service.login({ email: 'logistica@ayudaenaccion.org', password: 'ClaveCorrecta123' });

      expect(update).toHaveBeenCalledWith('user-7', {
        lastLoginAt: expect.any(Date),
      });
    });

    it('no registra el acceso cuando la autenticacion falla', async () => {
      findOneBy.mockResolvedValue(buildUser({ passwordHash: HASH_SENO }));

      await service
        .login({ email: 'logistica@ayudaenaccion.org', password: 'Mala123456' })
        .catch(() => undefined);

      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('actualiza el hash cuando la contraseña actual es correcta', async () => {
      findOneBy.mockResolvedValue(buildUser());
      const hashSpy = vi.spyOn(service, 'hash').mockResolvedValue('hash-nuevo');

      await service.changePassword(ADMIN_ID, 'ClaveCorrecta123', 'ClaveNueva456');

      expect(hashSpy).toHaveBeenCalledWith('ClaveNueva456');
      expect(update).toHaveBeenCalledWith(ADMIN_ID, { passwordHash: 'hash-nuevo' });
    });

    it('rechaza el cambio cuando la contraseña actual no coincide', async () => {
      findOneBy.mockResolvedValue(buildUser({ passwordHash: HASH_SENO }));

      await expect(
        service.changePassword(ADMIN_ID, 'NoEsLaMia123', 'ClaveNueva456'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('devuelve los datos del usuario de la sesion', async () => {
      findOneBy.mockResolvedValue(
        buildUser({ id: 'user-3', email: 'tecnico@ayudaenaccion.org', role: UserRole.REQUESTER }),
      );

      const result = await service.me('user-3');

      expect(result.id).toBe('user-3');
      expect(result.email).toBe('tecnico@ayudaenaccion.org');
      expect(result.role).toBe(UserRole.REQUESTER);
    });

    it('rechaza una sesion cuyo usuario ya no existe', async () => {
      findOneBy.mockResolvedValue(null);

      await expect(service.me('no-existe')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
