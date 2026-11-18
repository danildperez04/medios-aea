import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';
import { EXPO_TOKEN_PATTERN } from '../expo-push.js';

export const DEVICE_PLATFORMS = ['android', 'ios'] as const;

/** Cuerpo de `PUT /notifications/devices`: el teléfono donde la persona recibe avisos. */
export class RegisterDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString({ message: 'El token del teléfono es obligatorio' })
  @Matches(EXPO_TOKEN_PATTERN, { message: 'El token del teléfono no es válido' })
  token: string;

  @ApiProperty({ enum: DEVICE_PLATFORMS })
  @IsIn(DEVICE_PLATFORMS, { message: 'La plataforma debe ser android o ios' })
  platform: (typeof DEVICE_PLATFORMS)[number];
}

/** Cuerpo de `POST /notifications/devices/remove`. */
export class RemoveDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString({ message: 'El token del teléfono es obligatorio' })
  @Matches(EXPO_TOKEN_PATTERN, { message: 'El token del teléfono no es válido' })
  token: string;
}
