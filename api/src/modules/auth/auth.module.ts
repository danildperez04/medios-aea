import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '#modules/users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { SessionController } from './session.controller.js';
import { SessionService } from './session.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // `expiresIn` es un tipo de plantilla en los tipos de jsonwebtoken
          // (por ejemplo '8h' o '30m'); el valor del .env no lo puede expresar.
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '8h',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    // Límite global de peticiones; el login lo endurece a 10 por minuto.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [AuthController, SessionController],
  providers: [AuthService, SessionService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule, ThrottlerModule],
})
export class AuthModule {}
