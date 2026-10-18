import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { Trim } from '#common/transformers/string.transformers.js';
import { BOOLEAN_QUERY_MESSAGE, ToBoolean } from '#common/transformers/to-boolean.transformer.js';

/** Query de `GET /drivers`. */
export class DriverFiltersDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: BOOLEAN_QUERY_MESSAGE })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca en nombre y número de licencia', maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Solo licencias vencidas o que vencen dentro de estos días (aviso del dashboard)',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'expiringWithinDays debe ser un número entero' })
  @Min(0)
  @Max(365)
  expiringWithinDays?: number;
}
