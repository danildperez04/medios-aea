import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';
import type { TimeRange } from '#common/utils/time-range.js';

/** Rango máximo de una consulta de agenda o disponibilidad. */
export const MAX_RANGE_DAYS = 31;

/**
 * Query `?from=…&to=…` para agenda y disponibilidad. Las fechas van en ISO-8601
 * con zona (`2026-10-20T08:00:00-06:00`); el periodo es semiabierto `[from, to)`.
 */
export class TimeRangeQueryDto {
  @ApiProperty({ example: '2026-10-20T08:00:00-06:00' })
  @IsISO8601({ strict: true }, { message: 'from debe ser una fecha ISO-8601 con hora' })
  from: string;

  @ApiProperty({ example: '2026-10-20T12:00:00-06:00' })
  @IsISO8601({ strict: true }, { message: 'to debe ser una fecha ISO-8601 con hora' })
  to: string;
}

/** Convierte y valida el rango: fin posterior al inicio y no más de 31 días. */
export function toTimeRange(query: { from: string; to: string }): TimeRange {
  const range = { start: new Date(query.from), end: new Date(query.to) };
  if (!(range.end > range.start)) {
    throw new BadRequestException('La hora de fin debe ser posterior a la de inicio.');
  }
  const days = (range.end.getTime() - range.start.getTime()) / 86_400_000;
  if (days > MAX_RANGE_DAYS) {
    throw new BadRequestException(`El rango no puede superar ${MAX_RANGE_DAYS} días.`);
  }
  return range;
}
