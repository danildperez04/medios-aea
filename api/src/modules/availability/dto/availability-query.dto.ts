import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TimeRangeQueryDto } from '#common/dto/time-range-query.dto.js';
import { ResourceType } from '#common/enums/domain.enums.js';

/** Query de `GET /availability` (RF-09). */
export class AvailabilityQueryDto extends TimeRangeQueryDto {
  @ApiPropertyOptional({
    enum: ResourceType,
    enumName: 'ResourceType',
    default: ResourceType.VEHICLE,
  })
  @IsOptional()
  @IsEnum(ResourceType, { message: 'El tipo de medio no es válido' })
  type?: ResourceType;

  @ApiPropertyOptional({ example: 4, description: 'Pasajeros (sin el conductor)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los pasajeros deben ser un número entero' })
  @Min(1, { message: 'Debe viajar al menos 1 pasajero' })
  @Max(60, { message: 'No se admiten más de 60 pasajeros' })
  passengers?: number;
}
