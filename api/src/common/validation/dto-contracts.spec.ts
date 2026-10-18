import { describe, expect, it } from 'vitest';
import { BadRequestException, ValidationPipe, type Type } from '@nestjs/common';
import { ChangePasswordDto } from '#modules/auth/dto/change-password.dto.js';
import { LoginDto } from '#modules/auth/dto/login.dto.js';
import { CreateProjectDto } from '#modules/projects/dto/create-project.dto.js';
import { UpdateProjectDto } from '#modules/projects/dto/update-project.dto.js';
import { CreateUserDto } from '#modules/users/dto/create-user.dto.js';
import { ResetPasswordDto } from '#modules/users/dto/reset-password.dto.js';
import { UpdateUserDto } from '#modules/users/dto/update-user.dto.js';

/**
 * Contrato de los DTO, validado con la misma configuración del ValidationPipe
 * de main.ts. Cubre lo que los mapped types (PartialType, OmitType, PickType)
 * podrían cambiar sin que nadie lo note: qué campos heredan, cuáles se quitan y
 * cómo se trata `null`.
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

async function validate<T>(dto: Type<T>, body: unknown): Promise<T> {
  return pipe.transform(body, { type: 'body', metatype: dto }) as Promise<T>;
}

async function errorsOf(dto: Type<unknown>, body: unknown): Promise<string[]> {
  try {
    await validate(dto, body);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    const response = (error as BadRequestException).getResponse() as { message: string[] };
    return response.message;
  }
}

const validUser = {
  fullName: '  María López ',
  email: ' maria@aea.org ',
  role: 'REQUESTER',
  password: 'Clave12345',
};

describe('CreateUserDto', () => {
  it('acepta un alta valida y recorta espacios', async () => {
    const dto = await validate(CreateUserDto, validUser);
    expect(dto.fullName).toBe('María López');
    expect(dto.email).toBe('maria@aea.org');
  });

  it('aplica la politica de contraseña compartida', async () => {
    const errors = await errorsOf(CreateUserDto, { ...validUser, password: 'clave12345' });
    expect(errors).toContain('La contraseña debe incluir una minúscula, una mayúscula y un número');
  });

  it('rechaza campos que no declara (mass assignment)', async () => {
    const errors = await errorsOf(CreateUserDto, { ...validUser, isActive: false });
    expect(errors.join()).toMatch(/isActive/);
  });
});

describe('UpdateUserDto — PartialType(OmitType(CreateUserDto, [password]))', () => {
  it('acepta un cuerpo vacio y cambios parciales', async () => {
    await expect(validate(UpdateUserDto, {})).resolves.toBeDefined();
    const dto = await validate(UpdateUserDto, { role: 'DRIVER' });
    expect(dto.role).toBe('DRIVER');
  });

  it('hereda las reglas del alta', async () => {
    expect(await errorsOf(UpdateUserDto, { fullName: 'ab' })).toContain(
      'El nombre debe tener al menos 3 caracteres',
    );
    expect(await errorsOf(UpdateUserDto, { role: 'CASHIER' })).toHaveLength(1);
  });

  it('no permite cambiar la contraseña por esta via', async () => {
    const errors = await errorsOf(UpdateUserDto, { password: 'Clave12345' });
    expect(errors.join()).toMatch(/password/);
  });

  it('rechaza null en campos obligatorios en lugar de dejarlo llegar a la base', async () => {
    expect(await errorsOf(UpdateUserDto, { fullName: null })).not.toHaveLength(0);
    expect(await errorsOf(UpdateUserDto, { email: null })).not.toHaveLength(0);
    expect(await errorsOf(UpdateUserDto, { isActive: null })).toContain(
      'isActive debe ser verdadero o falso',
    );
  });

  it('acepta phone null para borrar el telefono, pero sigue validando su longitud', async () => {
    await expect(validate(UpdateUserDto, { phone: null })).resolves.toBeDefined();
    expect(await errorsOf(UpdateUserDto, { phone: '9'.repeat(31) })).toContain(
      'El teléfono no puede exceder 30 caracteres',
    );
  });
});

describe('ResetPasswordDto — PickType(CreateUserDto, [password])', () => {
  it('solo acepta la contraseña, con la misma politica', async () => {
    await expect(validate(ResetPasswordDto, { password: 'Nueva12345' })).resolves.toBeDefined();
    expect(await errorsOf(ResetPasswordDto, { password: 'corta' })).not.toHaveLength(0);
    expect(
      (await errorsOf(ResetPasswordDto, { password: 'Nueva12345', role: 'ADMIN' })).join(),
    ).toMatch(/role/);
  });
});

describe('CreateProjectDto y UpdateProjectDto', () => {
  it('normaliza el codigo antes de validarlo', async () => {
    const dto = await validate(CreateProjectDto, { code: ' pry-agua ', name: 'Agua segura' });
    expect(dto.code).toBe('PRY-AGUA');
  });

  it('el update hereda la normalizacion y la validacion del codigo', async () => {
    const dto = await validate(UpdateProjectDto, { code: 'pry-edu' });
    expect(dto.code).toBe('PRY-EDU');
    expect(await errorsOf(UpdateProjectDto, { code: 'PRY EDU!' })).toContain(
      'El código solo admite letras, números y guiones',
    );
  });

  it('rechaza null en nombre y estado', async () => {
    expect(await errorsOf(UpdateProjectDto, { name: null })).not.toHaveLength(0);
    expect(await errorsOf(UpdateProjectDto, { isActive: null })).not.toHaveLength(0);
  });
});

describe('DTO de autenticacion', () => {
  it('LoginDto recorta el correo', async () => {
    const dto = await validate(LoginDto, { email: ' admin@aea.org ', password: 'Clave12345' });
    expect(dto.email).toBe('admin@aea.org');
  });

  it('ChangePasswordDto usa la politica compartida en la contraseña nueva', async () => {
    const errors = await errorsOf(ChangePasswordDto, {
      currentPassword: 'Actual12345',
      newPassword: 'sinmayus123',
    });
    expect(errors).toContain(
      'La contraseña nueva debe incluir una minúscula, una mayúscula y un número',
    );
  });
});
