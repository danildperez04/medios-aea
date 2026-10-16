import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Public } from '#common/decorators/public.decorator.js';
import { CurrentUser } from '#common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { AuthService, type LoginResult } from './auth.service.js';

/** Cuerpo de `POST /auth/login`. */
export class LoginDto {
  @ApiProperty({ example: 'logistica@ayudaenaccion.org', description: 'Correo del usuario' })
  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @ApiProperty({ example: 'ClaveSegura123', minLength: 8 })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}

/** Cuerpo de `PATCH /auth/password`. */
export class ChangePasswordDto {
  @ApiProperty({ example: 'ClaveActual123' })
  @IsString({ message: 'La contraseña actual es obligatoria' })
  @MinLength(8, { message: 'La contraseña actual debe tener al menos 8 caracteres' })
  currentPassword: string;

  @ApiProperty({ example: 'ClaveNueva123', minLength: 8 })
  @IsString({ message: 'La contraseña nueva es obligatoria' })
  @MinLength(8, { message: 'La contraseña nueva debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir una minúscula, una mayúscula y un número',
  })
  newPassword: string;
}

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Límite por IP: defensa contra fuerza bruta (docs/14-arquitectura.md §5, RNF-01)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión y obtener un token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Sesión iniciada', type: Object })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos' })
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login({ email: dto.email, password: dto.password });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Datos del usuario de la sesión actual' })
  me(@CurrentUser() current: AuthenticatedUser): Promise<AuthenticatedUser> {
    return this.authService.me(current.id);
  }

  @Patch('password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario actual' })
  changePassword(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService
      .changePassword(current.id, dto.currentPassword, dto.newPassword)
      .then(() => ({ message: 'La contraseña se actualizó correctamente.' }));
  }
}
