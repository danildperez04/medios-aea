import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { ResourceStatus } from '#common/enums/domain.enums.js';
import { Trim } from '#common/transformers/string.transformers.js';

/** Query de `GET /vehicles`. Sin `status` se listan todos menos los dados de baja. */
export class VehicleFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ResourceStatus, enumName: 'ResourceStatus' })
  @IsOptional()
  @IsEnum(ResourceStatus, { message: 'El estado debe ser AVAILABLE, MAINTENANCE o INACTIVE' })
  status?: ResourceStatus;

  @ApiPropertyOptional({ description: 'Busca en nombre, placa, marca y modelo', maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}
