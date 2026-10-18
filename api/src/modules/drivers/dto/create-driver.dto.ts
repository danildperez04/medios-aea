import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { TrimUpperCase } from '#common/transformers/string.transformers.js';

/** Cuerpo de `POST /drivers` (RF-07): completa a un usuario DRIVER con su licencia. */
export class CreateDriverDto {
  @ApiProperty({ description: 'Usuario existente con rol DRIVER' })
  @IsUUID('4', { message: 'El usuario no es válido' })
  userId: string;

  @ApiProperty({ example: 'B-1234567', description: 'Se guarda en mayúsculas' })
  @TrimUpperCase()
  @IsString({ message: 'El número de licencia es obligatorio' })
  @MinLength(4, { message: 'El número de licencia debe tener al menos 4 caracteres' })
  @MaxLength(40, { message: 'El número de licencia no puede exceder 40 caracteres' })
  licenseNumber: string;

  @ApiProperty({ example: '2028-03-31', description: 'Fecha de vencimiento (AAAA-MM-DD)' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'El vencimiento debe ser una fecha AAAA-MM-DD',
  })
  licenseExpiry: string;
}
