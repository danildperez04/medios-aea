import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '#common/decorators/public.decorator.js';
import { CurrentUser } from '#common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { AuthService, type LoginResult } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';

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
