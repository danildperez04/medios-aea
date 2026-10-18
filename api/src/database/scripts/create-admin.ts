import 'reflect-metadata';
import { createInterface } from 'node:readline';
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
 * shell ni en un archivo. También acepta las respuestas por stdin, una por línea,
 * para automatizarlo: `printf 'Nombre\ncorreo\nClave\n' | node .../create-admin.js`.
 */
async function main(): Promise<void> {
  const logger = new Logger('CreateAdmin');
  const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
  // La entrada se consume como iterador. Con `rl.question` y stdin redirigido, las
  // líneas llegaban antes de cada pregunta y se perdían: el script terminaba en
  // silencio con código 0 sin crear a nadie.
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt: string): Promise<string> => {
    stdout.write(prompt);
    const next = await lines.next();
    if (next.done) throw new Error('La entrada terminó antes de responder todas las preguntas.');
    return String(next.value).trim();
  };
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  try {
    const fullName = await ask('Nombre completo: ');
    const email = (await ask('Correo electrónico: ')).toLowerCase();
    const password = await ask('Contraseña (mín. 8, mayúscula, minúscula y número): ');
    stdout.write('\n');

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
