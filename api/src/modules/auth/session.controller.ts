import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from '#common/decorators/public.decorator.js';
import type { LoginResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import {
  readCookie,
  REFRESH_COOKIE,
  WEB_CLIENT_HEADER,
  WEB_CLIENT_VALUE,
} from './session.cookie.js';
import { SessionService, type SessionResult } from './session.service.js';

/**
 * Sesión del panel web (ADR 0003). El token de acceso va en el cuerpo y el panel lo
 * guarda solo en memoria; el refresh token va en una cookie HttpOnly que JavaScript no
 * puede leer. La app móvil no usa estas rutas: sigue con `POST /auth/login`.
 */
@ApiTags('Autenticación')
@Public()
@Controller('auth/session')
export class SessionController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  // Mismo límite que el login de la app: defensa contra fuerza bruta (RNF-01).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión en el panel: token en memoria y cookie de refresh' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  async start(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    return this.respond(res, await this.sessions.start(dto));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: WEB_CLIENT_HEADER,
    required: true,
    description: `Siempre "${WEB_CLIENT_VALUE}"`,
  })
  @ApiOperation({ summary: 'Renovar el token de acceso; rota el refresh token' })
  @ApiResponse({ status: 401, description: 'Sin sesión, vencida, revocada o reutilizada' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    this.assertWebClient(req);
    try {
      return this.respond(res, await this.sessions.refresh(this.cookieOf(req)));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiHeader({
    name: WEB_CLIENT_HEADER,
    required: true,
    description: `Siempre "${WEB_CLIENT_VALUE}"`,
  })
  @ApiOperation({ summary: 'Cerrar la sesión del panel: revoca el refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    this.assertWebClient(req);
    await this.sessions.end(this.cookieOf(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  private respond(res: Response, session: SessionResult): LoginResult {
    const { refreshToken, refreshExpiresAt, ...access } = session;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.cookieOptions(),
      expires: refreshExpiresAt,
    });
    return access;
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: this.config.get<boolean>('COOKIE_SECURE', false),
      // Solo viaja a estas rutas: el resto de la API no la recibe.
      path: `/${this.config.get<string>('API_PREFIX', 'api/v1')}/auth/session`,
    };
  }

  private cookieOf(req: Request): string | undefined {
    return readCookie(req.headers.cookie, REFRESH_COOKIE);
  }

  private assertWebClient(req: Request): void {
    if (req.headers[WEB_CLIENT_HEADER] !== WEB_CLIENT_VALUE) {
      throw new ForbiddenException(
        `Petición rechazada: falta el encabezado ${WEB_CLIENT_HEADER} del panel.`,
      );
    }
  }
}
