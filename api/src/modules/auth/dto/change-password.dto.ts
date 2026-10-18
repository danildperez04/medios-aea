import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '#common/validation/password.policy.js';

/** Cuerpo de `PATCH /auth/password` (RF-05). */
export class ChangePasswordDto {
  @ApiProperty({ example: 'ClaveActual123' })
  @IsString({ message: 'La contraseña actual es obligatoria' })
  @MinLength(8, { message: 'La contraseña actual debe tener al menos 8 caracteres' })
  currentPassword: string;

  @ApiProperty({ example: 'ClaveNueva123', minLength: 8 })
  @IsStrongPassword('La contraseña nueva')
  newPassword: string;
}
