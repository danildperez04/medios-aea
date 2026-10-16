import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Trim, TrimUpperCase } from '#common/transformers/string.transformers.js';

/** Cuerpo de `POST /projects` (RF-04). */
export class CreateProjectDto {
  @ApiProperty({
    example: 'PRY-AGUA-2026',
    description: 'Se guarda en mayúsculas. Letras, números y guiones.',
    minLength: 2,
    maxLength: 30,
  })
  @TrimUpperCase()
  @IsString({ message: 'El código es obligatorio' })
  @MinLength(2, { message: 'El código debe tener al menos 2 caracteres' })
  @MaxLength(30, { message: 'El código no puede exceder 30 caracteres' })
  @Matches(/^[A-Z0-9][A-Z0-9-]*$/, { message: 'El código solo admite letras, números y guiones' })
  code: string;

  @ApiProperty({ example: 'Agua segura en comunidades rurales', minLength: 3, maxLength: 160 })
  @Trim()
  @IsString({ message: 'El nombre es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(160, { message: 'El nombre no puede exceder 160 caracteres' })
  name: string;
}
