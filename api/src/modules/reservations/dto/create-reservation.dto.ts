import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ResourceType } from '#common/enums/domain.enums.js';
import { Trim } from '#common/transformers/string.transformers.js';

/** Cuerpo de `POST /reservations` (RF-10, HU-09). */
export class CreateReservationDto {
  @ApiProperty({ description: 'Proyecto activo al que se carga el viaje' })
  @IsUUID('4', { message: 'Elige un proyecto' })
  projectId: string;

  @ApiProperty({ example: 'Taller de liderazgo juvenil' })
  @Trim()
  @IsString({ message: 'Indica para qué se necesita el medio' })
  @MinLength(5, { message: 'Describe el propósito con al menos 5 caracteres' })
  @MaxLength(300, { message: 'El propósito no puede exceder 300 caracteres' })
  purpose: string;

  @ApiProperty({ example: 'Comunidad El Rosario, Totogalpa' })
  @Trim()
  @IsString({ message: 'Indica el destino' })
  @MinLength(3, { message: 'El destino debe tener al menos 3 caracteres' })
  @MaxLength(200, { message: 'El destino no puede exceder 200 caracteres' })
  destination: string;

  @ApiProperty({ example: 3, description: 'Personas que viajan, sin contar al conductor' })
  @IsInt({ message: 'Los pasajeros deben ser un número entero' })
  @Min(1, { message: 'Debe viajar al menos 1 persona' })
  @Max(60, { message: 'No se admiten más de 60 pasajeros' })
  passengers: number;

  @ApiProperty({ example: '2026-10-22T07:00:00-06:00' })
  @IsISO8601({ strict: true }, { message: 'El inicio debe ser una fecha ISO-8601 con hora' })
  startsAt: string;

  @ApiProperty({ example: '2026-10-22T15:00:00-06:00' })
  @IsISO8601({ strict: true }, { message: 'El fin debe ser una fecha ISO-8601 con hora' })
  endsAt: string;

  @ApiPropertyOptional({
    enum: ResourceType,
    enumName: 'ResourceType',
    default: ResourceType.VEHICLE,
  })
  @IsOptional()
  @IsEnum(ResourceType, { message: 'El tipo de medio no es válido' })
  resourceType?: ResourceType;

  @ApiPropertyOptional({ description: 'Medio que se prefiere; la coordinación decide al aprobar' })
  @IsOptional()
  @IsUUID('4', { message: 'El medio preferido no es válido' })
  preferredResourceId?: string;

  @ApiPropertyOptional({
    description:
      'Conductor propuesto (RN-15). Si se omite en un vehículo, conduce quien solicita, si tiene licencia registrada',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El conductor propuesto no es válido' })
  proposedDriverId?: string;

  @ApiPropertyOptional({
    description: 'Solo ADMIN: crear la solicitud en nombre de otra persona (RN-14)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'La persona solicitante no es válida' })
  requesterId?: string;
}
