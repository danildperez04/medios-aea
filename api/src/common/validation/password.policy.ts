import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';

/** Una minúscula, una mayúscula y un número. La web valida lo mismo con zod. */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Política de contraseñas del sistema (RNF-01), en un solo decorador para que el
 * alta de usuarios, el restablecimiento y el cambio de contraseña no diverjan.
 */
export function IsStrongPassword(field = 'La contraseña'): PropertyDecorator {
  return applyDecorators(
    IsString({ message: `${field} es obligatoria` }),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `${field} debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    }),
    Matches(PASSWORD_PATTERN, {
      message: `${field} debe incluir una minúscula, una mayúscula y un número`,
    }),
  );
}
