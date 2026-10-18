import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { IsOptionalNonNull } from '#common/validation/optional.js';
import { CreateProjectDto } from './create-project.dto.js';

/**
 * Cuerpo de `PATCH /projects/:id`: cualquier campo del alta, más el estado.
 * `null` se valida (400) en lugar de llegar a la base (ver UpdateUserDto).
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto, { skipNullProperties: false }) {
  @ApiPropertyOptional({ description: 'false desactiva el proyecto (no se borra)' })
  @IsOptionalNonNull()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;
}
