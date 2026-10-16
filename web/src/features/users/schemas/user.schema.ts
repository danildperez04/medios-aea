import { z } from 'zod';

/** Misma política de contraseña que la API (api/src/modules/users/dto/user.dto.ts). */
export const passwordRule = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    'La contraseña debe incluir una minúscula, una mayúscula y un número',
  );

const base = {
  fullName: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(120, 'El nombre no puede exceder 120 caracteres'),
  email: z.string().trim().email('Escribe un correo válido').max(160),
  phone: z.string().trim().max(30, 'El teléfono no puede exceder 30 caracteres'),
  role: z.enum(['ADMIN', 'REQUESTER', 'DRIVER'], { message: 'Elige un rol' }),
};

export const createUserSchema = z.object({ ...base, password: passwordRule });
export const updateUserSchema = z.object(base);

export type CreateUserForm = z.infer<typeof createUserSchema>;
export type UpdateUserForm = z.infer<typeof updateUserSchema>;

export const ROLE_LABELS = {
  ADMIN: 'Coordinación (admin)',
  REQUESTER: 'Técnico/a',
  DRIVER: 'Conductor/a',
} as const;
