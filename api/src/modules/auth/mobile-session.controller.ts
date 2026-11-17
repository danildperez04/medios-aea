import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '#common/decorators/public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { SessionService, type SessionResult } from './session.service.js';

/**
 * Sesión de la app móvil (HU-28, ADR 0003). Mismo mecanismo que el panel, pero el
 * refresh token viaja en el cuerpo, porque la app no usa cookies, y se guarda en
 * SecureStore. Sin cookies no hay CSRF que defender: no se exige el encabezado del panel.
 */
@ApiTags('Autenticación')
@Public()
@Controller('auth/mobile-session')
export class MobileSessionController {
  constructor(@Inject(SessionService) private readonly sessions: SessionService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  // Mismo límite que los otros inicios de sesión: defensa contra fuerza bruta (RNF-01).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión en la app: token de acceso corto y refresh token' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  @ApiResponse({ status: 403, description: 'Cuenta desactivada' })
  start(@Body() dto: LoginDto): Promise<SessionResult> {
    return this.sessions.start(dto, 'mobile');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // Una app sana renueva cada 15 minutos; esto frena a quien pruebe tokens al azar.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Renovar el token de acceso; rota el refresh token' })
  @ApiResponse({ status: 401, description: 'Sesión vencida, revocada o reutilizada' })
  refresh(@Body() dto: RefreshTokenDto): Promise<SessionResult> {
    return this.sessions.refresh(dto.refreshToken, 'mobile');
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cerrar la sesión de la app: revoca el refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.sessions.end(dto.refreshToken, 'mobile');
  }
}
