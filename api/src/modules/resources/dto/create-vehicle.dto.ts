import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FuelType } from '#common/enums/domain.enums.js';
import { Trim, TrimUpperCase } from '#common/transformers/string.transformers.js';

/** Cuerpo de `POST /vehicles` (RF-06). Crea el `resource` y su detalle `vehicle`. */
export class CreateVehicleDto {
  @ApiProperty({ example: 'Hilux blanca', description: 'Nombre con el que el equipo lo reconoce' })
  @Trim()
  @IsString({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede exceder 120 caracteres' })
  name: string;

  @ApiProperty({ example: 'M 123-456', description: 'Se guarda en mayúsculas' })
  @TrimUpperCase()
  @IsString({ message: 'La placa es obligatoria' })
  @Matches(/^[A-Z0-9][A-Z0-9 -]{2,18}[A-Z0-9]$/, {
    message: 'La placa solo admite letras, números, espacios y guiones (4 a 20 caracteres)',
  })
  plate: string;

  @ApiProperty({ example: 'Toyota' })
  @Trim()
  @IsString({ message: 'La marca es obligatoria' })
  @MinLength(2, { message: 'La marca debe tener al menos 2 caracteres' })
  @MaxLength(60, { message: 'La marca no puede exceder 60 caracteres' })
  brand: string;

  @ApiProperty({ example: 'Hilux' })
  @Trim()
  @IsString({ message: 'El modelo es obligatorio' })
  @MinLength(1, { message: 'El modelo es obligatorio' })
  @MaxLength(60, { message: 'El modelo no puede exceder 60 caracteres' })
  model: string;

  @ApiPropertyOptional({ example: 2022, nullable: true })
  @IsOptional()
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(1980, { message: 'El año no puede ser anterior a 1980' })
  @Max(2100, { message: 'El año no es válido' })
  year?: number | null;

  @ApiProperty({ example: 4, description: 'Pasajeros sin contar al conductor' })
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  @Min(1, { message: 'La capacidad debe ser de al menos 1 pasajero' })
  @Max(60, { message: 'La capacidad no puede superar 60 pasajeros' })
  passengerCapacity: number;

  @ApiProperty({ enum: FuelType, enumName: 'FuelType' })
  @IsEnum(FuelType, { message: 'El combustible debe ser GASOLINE o DIESEL' })
  fuelType: FuelType;

  @ApiPropertyOptional({ example: 45200, description: 'Kilometraje actual' })
  @IsOptional()
  @IsInt({ message: 'El kilometraje debe ser un número entero' })
  @Min(0, { message: 'El kilometraje no puede ser negativo' })
  currentOdometer?: number;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Trim()
  @IsString({ message: 'Las notas deben ser texto' })
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string | null;
}
