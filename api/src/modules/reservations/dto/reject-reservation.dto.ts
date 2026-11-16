import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '#common/transformers/string.transformers.js';

/** Cuerpo de `POST /reservations/:id/reject` (RF-13, HU-12). */
export class RejectReservationDto {
  @ApiProperty({
    example: 'No hay medios libres ese día por la feria departamental.',
    description: 'Lo lee quien pidió: debe explicar el porqué',
  })
  @Trim()
  @IsString({ message: 'Indica el motivo del rechazo' })
  @MinLength(5, { message: 'Explica el motivo con al menos 5 caracteres' })
  @MaxLength(300, { message: 'El motivo no puede exceder 300 caracteres' })
  reason: string;
}
