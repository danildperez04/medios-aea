import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/** Cuerpo de renovar y cerrar la sesión de la app: el refresh token guardado. */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token que entregó el inicio de sesión o la última renovación',
  })
  @IsString({ message: 'El refresh token es obligatorio' })
  @Length(20, 200, { message: 'El refresh token no es válido' })
  refreshToken: string;
}
