import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '#common/enums/domain.enums.js';
import { Trim } from '#common/transformers/string.transformers.js';
import { IsStrongPassword } from '#common/validation/password.policy.js';

/** Cuerpo de `POST /users` (RF-03). Base de los demás DTO de usuario. */
export class CreateUserDto {
  @ApiProperty({ example: 'María López', minLength: 3, maxLength: 120 })
  @Trim()
  @IsString({ message: 'El nombre es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede exceder 120 caracteres' })
  fullName: string;

  @ApiProperty({ example: 'maria.lopez@ayudaenaccion.org', maxLength: 160 })
  @Trim()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(160, { message: 'El correo no puede exceder 160 caracteres' })
  email: string;

  @ApiPropertyOptional({ example: '+505 8888 0000', maxLength: 30, nullable: true })
  @IsOptional()
  @Trim()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede exceder 30 caracteres' })
  phone?: string | null;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, REQUESTER o DRIVER' })
  role: UserRole;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8 })
  @IsStrongPassword()
  password: string;
}
