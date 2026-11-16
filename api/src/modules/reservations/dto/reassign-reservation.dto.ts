import { PartialType } from '@nestjs/swagger';
import { ApproveReservationDto } from './approve-reservation.dto.js';

/**
 * Cuerpo de `POST /reservations/:id/reassign` (RF-15, HU-13): el medio, quien
 * conduce o ambos. Lo que se omite se mantiene; al menos uno debe cambiar.
 */
export class ReassignReservationDto extends PartialType(ApproveReservationDto, {
  skipNullProperties: false,
}) {}
