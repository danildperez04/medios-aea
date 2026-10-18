import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { IsOptionalNonNull } from '#common/validation/optional.js';
import { CreateDriverDto } from './create-driver.dto.js';

/** Cuerpo de `PATCH /drivers/:id`: licencia y estado. El usuario vinculado no cambia. */
export class UpdateDriverDto extends PartialType(OmitType(CreateDriverDto, ['userId'] as const), {
  skipNullProperties: false,
}) {
  @ApiPropertyOptional()
  @IsOptionalNonNull()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;
}
