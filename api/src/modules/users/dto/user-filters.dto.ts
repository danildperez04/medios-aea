import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { Trim } from '#common/transformers/string.transformers.js';
import { BOOLEAN_QUERY_MESSAGE, ToBoolean } from '#common/transformers/to-boolean.transformer.js';

/** Query de `GET /users`. */
export class UserFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole, enumName: 'UserRole' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser ADMIN, REQUESTER o DRIVER' })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: BOOLEAN_QUERY_MESSAGE })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca en nombre y correo', maxLength: 100 })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}
