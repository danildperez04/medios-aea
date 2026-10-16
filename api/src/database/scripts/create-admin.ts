import 'reflect-metadata';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hash } from 'bcrypt';
import { Logger } from '@nestjs/common';
import dataSource from '../data-source.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { User } from '#modules/users/entities/user.entity.js';

/**
 * Crea el primer administrador (coordinación logística).
 *
 * Uso: pnpm --filter @medios-aea/api user:create-admin
 *
 * Pide los datos por consola para no dejar credenciales en el historial del
 * shell ni en un archivo.
 */
async function main(): Promise<void> {
  const logger = new Logger('CreateAdmin');
  const rl = createInterface({ input: stdin, output: stdout });
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  try {
    const fullName = (await rl.question('Nombre completo: ')).trim();
    const email = (await rl.question('Correo electrónico: ')).trim().toLowerCase();
    const password = (
      await rl.question('Contraseña (mín. 8, mayúscula, minúscula y número): ')
    ).trim();

    if (!fullName || !/^\S+@\S+\.\S+$/.test(email)) {
      logger.error('Datos incompletos: revisa el nombre y el correo.');
      process.exitCode = 1;
      return;
    }
    if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(password)) {
      logger.error(
        'La contraseña no cumple la política (8+ caracteres, mayúscula, minúscula y número).',
      );
      process.exitCode = 1;
      return;
    }

    await dataSource.initialize();
    const users = dataSource.getRepository(User);
    const existing = await users
      .createQueryBuilder('user')
      .where('lower(user.email) = :email', { email })
      .getOne();
    if (existing) {
      logger.error(`Ya existe un usuario con el correo ${email}.`);
      process.exitCode = 1;
      return;
    }

    await users.save(
      users.create({
        fullName,
        email,
        phone: null,
        passwordHash: await hash(password, rounds),
        role: UserRole.ADMIN,
        isActive: true,
      }),
    );
    logger.log(`Administrador ${email} creado correctamente.`);
  } finally {
    rl.close();
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error('Error al crear el administrador:', error);
  process.exit(1);
});
