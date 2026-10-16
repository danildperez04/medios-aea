import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '#common/enums/domain.enums.js';
import type { AuthService } from '#modules/auth/auth.service.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

/**
 * Pruebas del servicio de usuarios (RF-03, HU-02).
 *
 * Lo critico: correo unico sin distinguir mayusculas, nunca guardar la
 * contraseña en claro y que un ADMIN no pueda dejarse fuera del sistema.
 */

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

function makeUser(overrides: Partial<User> = {}): User {
  return Object.assign(new User(), {
    id: OTHER_ID,
    fullName: 'María López',
    email: 'maria@aea.org',
    phone: null,
    role: UserRole.REQUESTER,
    isActive: true,
    ...overrides,
  });
}

describe('UsersService', () => {
  let service: UsersService;
  let stored: Map<string, User>;
  let emailMatch: User | null;
  const hash = vi.fn(async (plain: string) => `hash(${plain})`);

  beforeEach(() => {
    stored = new Map([
      [OTHER_ID, makeUser()],
      [ADMIN_ID, makeUser({ id: ADMIN_ID, role: UserRole.ADMIN })],
    ]);
    emailMatch = null;
    const repo = {
      findOneBy: vi.fn(async ({ id }: { id: string }) => stored.get(id) ?? null),
      create: (data: Partial<User>) => Object.assign(new User(), data),
      save: vi.fn(async (user: User) => {
        user.id = user.id ?? 'new-id';
        stored.set(user.id, user);
        return user;
      }),
      update: vi.fn(async (id: string, patch: Partial<User>) => {
        Object.assign(stored.get(id) ?? {}, patch);
      }),
      createQueryBuilder: () => ({
        where: () => ({ getOne: async () => emailMatch }),
      }),
    };
    service = new UsersService(repo as never, { hash } as unknown as AuthService);
  });

  describe('create', () => {
    it('guarda el correo en minusculas y la contraseña hasheada', async () => {
      const user = await service.create({
        fullName: 'Juan Pérez',
        email: 'Juan.Perez@AEA.org',
        role: UserRole.DRIVER,
        password: 'Clave12345',
      });

      expect(user.email).toBe('juan.perez@aea.org');
      expect(user.passwordHash).toBe('hash(Clave12345)');
      expect(user.isActive).toBe(true);
      expect(user.phone).toBeNull();
    });

    it('rechaza un correo ya registrado con 409', async () => {
      emailMatch = makeUser();
      await expect(
        service.create({
          fullName: 'Otra María',
          email: 'MARIA@aea.org',
          role: UserRole.REQUESTER,
          password: 'Clave12345',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('cambia rol y datos de otro usuario', async () => {
      const user = await service.update(
        OTHER_ID,
        { role: UserRole.DRIVER, phone: '8888' },
        ADMIN_ID,
      );
      expect(user.role).toBe(UserRole.DRIVER);
      expect(user.phone).toBe('8888');
    });

    it('permite conservar el propio correo sin reportar conflicto', async () => {
      emailMatch = stored.get(OTHER_ID)!;
      await expect(
        service.update(OTHER_ID, { email: 'MARIA@aea.org' }, ADMIN_ID),
      ).resolves.toBeDefined();
    });

    it('rechaza cambiar al correo de otra persona', async () => {
      emailMatch = makeUser({ id: 'otro' });
      await expect(
        service.update(OTHER_ID, { email: 'ocupado@aea.org' }, ADMIN_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('impide que el ADMIN se desactive a si mismo', async () => {
      await expect(service.update(ADMIN_ID, { isActive: false }, ADMIN_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('impide que el ADMIN se quite el rol a si mismo', async () => {
      await expect(
        service.update(ADMIN_ID, { role: UserRole.REQUESTER }, ADMIN_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza 404 si el usuario no existe', async () => {
      await expect(service.update('no-existe', { fullName: 'X' }, ADMIN_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('desactivar no borra: deja isActive en false', async () => {
    await service.deactivate(OTHER_ID, ADMIN_ID);
    expect(stored.get(OTHER_ID)?.isActive).toBe(false);
  });

  it('restablecer la contraseña guarda solo el hash', async () => {
    await service.resetPassword(OTHER_ID, 'NuevaClave1');
    expect(stored.get(OTHER_ID)?.passwordHash).toBe('hash(NuevaClave1)');
  });
});
