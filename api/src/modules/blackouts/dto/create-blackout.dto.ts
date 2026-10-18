import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { BlackoutReason } from '#common/enums/domain.enums.js';
import { Trim } from '#common/transformers/string.transformers.js';

/** Cuerpo de `POST /resources/:id/blackouts` (RF-08). */
export class CreateBlackoutDto {
  @ApiProperty({ example: '2026-10-22T07:00:00-06:00' })
  @IsISO8601({ strict: true }, { message: 'El inicio debe ser una fecha ISO-8601 con hora' })
  startsAt: string;

  @ApiProperty({ example: '2026-10-23T17:00:00-06:00' })
  @IsISO8601({ strict: true }, { message: 'El fin debe ser una fecha ISO-8601 con hora' })
  endsAt: string;

  @ApiProperty({ enum: BlackoutReason, enumName: 'BlackoutReason' })
  @IsEnum(BlackoutReason, { message: 'El motivo debe ser MAINTENANCE, ADMINISTRATIVE u OTHER' })
  reason: BlackoutReason;

  @ApiPropertyOptional({ example: 'Cambio de frenos en el taller de Estelí', maxLength: 300 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(300, { message: 'La descripción no puede exceder 300 caracteres' })
  description?: string | null;
}
