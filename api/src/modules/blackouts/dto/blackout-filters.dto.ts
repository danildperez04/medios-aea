import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

/** Query de `GET /resources/:id/blackouts`. Sin rango: los bloqueos que aún no terminan. */
export class BlackoutFiltersDto {
  @ApiPropertyOptional({ example: '2026-10-01T00:00:00-06:00' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'from debe ser una fecha ISO-8601 con hora' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-01T00:00:00-06:00' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'to debe ser una fecha ISO-8601 con hora' })
  to?: string;
}
