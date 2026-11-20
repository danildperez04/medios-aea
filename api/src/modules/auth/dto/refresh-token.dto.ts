import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { EXPO_TOKEN_PATTERN } from '#modules/notifications/expo-push.js';

/** Cuerpo de renovar y cerrar la sesión de la app: el refresh token guardado. */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token que entregó el inicio de sesión o la última renovación',
  })
  @IsString({ message: 'El refresh token es obligatorio' })
  @Length(20, 200, { message: 'El refresh token no es válido' })
  refreshToken: string;
}

/** Cuerpo de cerrar la sesión de la app: además, deja de enviar avisos a este teléfono. */
export class MobileLogoutDto extends RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Token push de este teléfono (HU-19)' })
  @IsOptional()
  @Matches(EXPO_TOKEN_PATTERN, { message: 'El token del teléfono no es válido' })
  pushToken?: string;
}
