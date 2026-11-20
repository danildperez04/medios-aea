import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { RequestStatus } from '#common/enums/domain.enums.js';
import { Trim } from '#common/transformers/string.transformers.js';
import { BOOLEAN_QUERY_MESSAGE, ToBoolean } from '#common/transformers/to-boolean.transformer.js';
import { IsDateTimeWithOffset } from '#common/validation/date-time.js';

/** Query de `GET /reservations`. Un REQUESTER solo recibe las suyas, filtre lo que filtre. */
export class ReservationFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: RequestStatus, enumName: 'RequestStatus' })
  @IsOptional()
  @IsEnum(RequestStatus, { message: 'El estado no es válido' })
  status?: RequestStatus;

  @ApiPropertyOptional({ description: 'Solicitudes que terminan después de esta fecha' })
  @IsOptional()
  @IsDateTimeWithOffset('from')
  from?: string;

  @ApiPropertyOptional({ description: 'Solicitudes que empiezan antes de esta fecha' })
  @IsOptional()
  @IsDateTimeWithOffset('to')
  to?: string;

  @ApiPropertyOptional({ description: 'Busca en código, destino y solicitante', maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description:
      'Solo las que pidió quien consulta. La app lo usa en "Mis solicitudes": a la coordinación le muestra las suyas, no las de todos (HU-18)',
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: BOOLEAN_QUERY_MESSAGE })
  mine?: boolean;
}
