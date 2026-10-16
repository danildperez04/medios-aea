import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { BOOLEAN_QUERY_MESSAGE, ToBoolean } from '#common/transformers/to-boolean.transformer.js';

/** El código se guarda en mayúsculas y sin espacios alrededor: `PRY-AGUA-2026`. */
const normalizeCode = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );
const trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

const CODE_RULE = /^[A-Z0-9][A-Z0-9-]*$/;
const CODE_MESSAGE = 'El código solo admite letras, números y guiones';

export class CreateProjectDto {
  @ApiProperty({ example: 'PRY-AGUA-2026' })
  @normalizeCode()
  @IsString({ message: 'El código es obligatorio' })
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres' })
  @MaxLength(30, { message: 'El código no puede exceder 30 caracteres' })
  @Matches(CODE_RULE, { message: CODE_MESSAGE })
  code: string;

  @ApiProperty({ example: 'Agua segura en comunidades rurales' })
  @trim()
  @IsString({ message: 'El nombre es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(160, { message: 'El nombre no puede exceder 160 caracteres' })
  name: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @normalizeCode()
  @IsString({ message: 'El código debe ser texto' })
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres' })
  @MaxLength(30, { message: 'El código no puede exceder 30 caracteres' })
  @Matches(CODE_RULE, { message: CODE_MESSAGE })
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @trim()
  @IsString({ message: 'El nombre debe ser texto' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(160, { message: 'El nombre no puede exceder 160 caracteres' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;
}

export class ProjectFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Solo el ADMIN puede ver los inactivos' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: BOOLEAN_QUERY_MESSAGE })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca en código y nombre' })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}
