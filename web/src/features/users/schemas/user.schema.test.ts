import { describe, expect, it } from 'vitest';
import { projectSchema } from '@/features/projects/schemas/project.schema';
import { createUserSchema } from './user.schema';

const validUser = {
  fullName: 'Ana Martínez',
  email: 'ana@aea.org',
  phone: '',
  role: 'REQUESTER' as const,
  password: 'Clave12345',
};

describe('createUserSchema', () => {
  it('acepta un usuario valido', () => {
    expect(createUserSchema.safeParse(validUser).success).toBe(true);
  });

  it('exige mayuscula, minuscula y numero en la contraseña, como la API', () => {
    for (const password of ['clave12345', 'CLAVE12345', 'ClaveSinNum', 'Cl1']) {
      expect(createUserSchema.safeParse({ ...validUser, password }).success).toBe(false);
    }
  });

  it('rechaza un rol que no existe', () => {
    expect(createUserSchema.safeParse({ ...validUser, role: 'CASHIER' }).success).toBe(false);
  });
});

describe('projectSchema', () => {
  it('normaliza el codigo a mayusculas', () => {
    const result = projectSchema.parse({ code: ' pry-agua ', name: 'Agua segura' });
    expect(result.code).toBe('PRY-AGUA');
  });

  it('rechaza espacios y simbolos en el codigo', () => {
    expect(projectSchema.safeParse({ code: 'PRY AGUA!', name: 'Agua' }).success).toBe(false);
  });
});
