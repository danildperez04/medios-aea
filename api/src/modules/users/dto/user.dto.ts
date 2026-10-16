import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { BOOLEAN_QUERY_MESSAGE, ToBoolean } from '#common/transformers/to-boolean.transformer.js';

const trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Misma política que el cambio de contraseña (auth.controller.ts). */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const PASSWORD_MESSAGE = 'La contraseña debe incluir una minúscula, una mayúscula y un número';

export class CreateUserDto {
  @ApiProperty({ example: 'María López' })
  @trim()
  @IsString({ message: 'El nombre es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede exceder 120 caracteres' })
  fullName: string;

  @ApiProperty({ example: 'maria.lopez@ayudaenaccion.org' })
  @trim()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(160, { message: 'El correo no puede exceder 160 caracteres' })
  email: string;

  @ApiPropertyOptional({ example: '+505 8888 0000' })
  @IsOptional()
  @trim()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede exceder 30 caracteres' })
  phone?: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, REQUESTER o DRIVER' })
  role: UserRole;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8 })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @trim()
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede exceder 120 caracteres' })
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @trim()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(160, { message: 'El correo no puede exceder 160 caracteres' })
  email?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @trim()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede exceder 30 caracteres' })
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, REQUESTER o DRIVER' })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;
}

/** Restablecer la contraseña de otro usuario (lo hace el ADMIN). */
export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;
}

export class UserFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, REQUESTER o DRIVER' })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: BOOLEAN_QUERY_MESSAGE })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca en nombre y correo' })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}
