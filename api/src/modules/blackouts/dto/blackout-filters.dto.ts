import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsDateTimeWithOffset } from '#common/validation/date-time.js';

/** Query de `GET /resources/:id/blackouts`. Sin rango: los bloqueos que aún no terminan. */
export class BlackoutFiltersDto {
  @ApiPropertyOptional({ example: '2026-10-01T00:00:00-06:00' })
  @IsOptional()
  @IsDateTimeWithOffset('from')
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00-06:00' })
  @IsOptional()
  @IsDateTimeWithOffset('to')
  to?: string;
}
