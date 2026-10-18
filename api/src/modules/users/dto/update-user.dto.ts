import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { IsOptionalNonNull } from '#common/validation/optional.js';
import { CreateUserDto } from './create-user.dto.js';

/**
 * Cuerpo de `PATCH /users/:id`: cualquier campo del alta salvo la contraseña
 * (se restablece aparte), más el estado.
 *
 * `skipNullProperties: false` hace que `null` se valide en vez de ignorarse:
 * `{ "fullName": null }` responde 400 en lugar de romper el NOT NULL de la base.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const), {
  skipNullProperties: false,
}) {
  /** Única excepción: `null` (o "") borra el teléfono. */
  @ApiPropertyOptional({ example: '+505 8888 0000', nullable: true })
  @IsOptional()
  declare phone?: string | null;

  @ApiPropertyOptional({ description: 'false desactiva la cuenta (no se borra)' })
  @IsOptionalNonNull()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;
}
