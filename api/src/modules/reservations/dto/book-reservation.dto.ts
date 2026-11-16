import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsOptionalNonNull } from '#common/validation/optional.js';
import { CreateReservationDto } from './create-reservation.dto.js';

/**
 * Cuerpo de `POST /reservations/book` (HU-27): la coordinación registra una reserva ya
 * aprobada. Lo mismo que una solicitud, pero con el medio y quien conduce ya decididos.
 */
export class BookReservationDto extends OmitType(CreateReservationDto, [
  'preferredResourceId',
  'proposedDriverId',
] as const) {
  @ApiProperty({ description: 'Medio que se asigna; debe estar libre en el horario' })
  @IsUUID('4', { message: 'Elige el medio que se asigna' })
  resourceId: string;

  @ApiPropertyOptional({
    description: 'Quién conduce; obligatorio en un vehículo. Debe estar libre en el horario',
  })
  @IsOptionalNonNull()
  @IsUUID('4', { message: 'El conductor no es válido' })
  driverId?: string;
}
