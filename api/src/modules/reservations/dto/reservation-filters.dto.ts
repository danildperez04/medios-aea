import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { RequestStatus } from '#common/enums/domain.enums.js';
import { Trim } from '#common/transformers/string.transformers.js';

/** Query de `GET /reservations`. Un REQUESTER solo recibe las suyas, filtre lo que filtre. */
export class ReservationFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: RequestStatus, enumName: 'RequestStatus' })
  @IsOptional()
  @IsEnum(RequestStatus, { message: 'El estado no es válido' })
  status?: RequestStatus;

  @ApiPropertyOptional({ description: 'Solicitudes que terminan después de esta fecha' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'from debe ser una fecha ISO-8601 con hora' })
  from?: string;

  @ApiPropertyOptional({ description: 'Solicitudes que empiezan antes de esta fecha' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'to debe ser una fecha ISO-8601 con hora' })
  to?: string;

  @ApiPropertyOptional({ description: 'Busca en código, destino y solicitante', maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}
