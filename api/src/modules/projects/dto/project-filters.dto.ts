import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { Trim } from '#common/transformers/string.transformers.js';
import { BOOLEAN_QUERY_MESSAGE, ToBoolean } from '#common/transformers/to-boolean.transformer.js';

/** Query de `GET /projects`. */
export class ProjectFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Solo el ADMIN puede ver los inactivos' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: BOOLEAN_QUERY_MESSAGE })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca en código y nombre', maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}
