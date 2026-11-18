import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { BOOLEAN_QUERY_MESSAGE, ToBoolean } from '#common/transformers/to-boolean.transformer.js';

/** Query de `GET /notifications`. */
export class NotificationFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Solo las no leídas' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: BOOLEAN_QUERY_MESSAGE })
  unread?: boolean;
}
