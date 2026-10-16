import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Parámetros de paginación y orden, base de todos los listados. */
export class PaginationDto {
  @ApiPropertyOptional({ description: 'Página, empezando en 1', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página mínima es 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El tamaño de página debe ser un número entero' })
  @Min(1, { message: 'El tamaño de página mínimo es 1' })
  @Max(100, { message: 'El tamaño de página máximo es 100' })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Columna de orden', default: 'createdAt' })
  @IsOptional()
  orderBy?: string;

  @ApiPropertyOptional({
    description: 'Dirección del orden',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';
}

/** Respuesta paginada uniforme para todos los listados. */
export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Elementos de la página actual' })
  data: T[];

  @ApiProperty({ description: 'Cantidad total de elementos que cumplen el filtro' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Cantidad total de páginas' })
  totalPages: number;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  }
}
