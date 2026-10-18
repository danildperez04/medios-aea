import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ResourceStatus } from '#common/enums/domain.enums.js';
import { IsOptionalNonNull } from '#common/validation/optional.js';
import { CreateVehicleDto } from './create-vehicle.dto.js';

/** Cuerpo de `PATCH /vehicles/:id`: cualquier dato del alta, más el estado. */
export class UpdateVehicleDto extends PartialType(CreateVehicleDto, { skipNullProperties: false }) {
  /** `null` borra el año o las notas; el resto de campos no admite null. */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  declare year?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  declare notes?: string | null;

  @ApiPropertyOptional({ enum: ResourceStatus, enumName: 'ResourceStatus' })
  @IsOptionalNonNull()
  @IsEnum(ResourceStatus, { message: 'El estado debe ser AVAILABLE, MAINTENANCE o INACTIVE' })
  status?: ResourceStatus;
}
