import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsOptionalNonNull } from '#common/validation/optional.js';

/** Cuerpo de `POST /reservations/:id/approve` (RF-12, HU-11). */
export class ApproveReservationDto {
  @ApiProperty({ description: 'Medio que se asigna; debe estar libre en el horario' })
  @IsUUID('4', { message: 'Elige el medio que se asigna' })
  resourceId: string;

  @ApiPropertyOptional({
    description:
      'Quién conduce. Si se omite, el conductor propuesto en la solicitud (RN-15); si se cambia, se avisa (ADR 0004)',
  })
  @IsOptionalNonNull()
  @IsUUID('4', { message: 'El conductor no es válido' })
  driverId?: string;
}
