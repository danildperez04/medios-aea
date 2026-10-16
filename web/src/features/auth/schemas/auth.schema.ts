import { z } from 'zod';

/** Esquemas de validacion del modulo de autenticacion (RF-01, capa cliente). */
export const loginSchema = z.object({
  email: z.string().trim().email('Escribe un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, 'La contraseña actual debe tener al menos 8 caracteres'),
    newPassword: z
      .string()
      .min(8, 'La contraseña nueva debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
        'La contraseña debe incluir una minúscula, una mayúscula y un número',
      ),
    confirmPassword: z.string().min(1, 'Confirma la contraseña nueva'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
