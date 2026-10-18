import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Trim } from '#common/transformers/string.transformers.js';

/** Cuerpo de `POST /auth/login`. */
export class LoginDto {
  @ApiProperty({ example: 'logistica@ayudaenaccion.org', description: 'Correo del usuario' })
  @Trim()
  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8 })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
