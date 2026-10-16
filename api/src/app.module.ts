import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { configValidationSchema } from '#config/index.js';
import { buildTypeOrmOptions } from '#config/typeorm.options.js';
import { AllExceptionsFilter } from '#common/filters/all-exceptions.filter.js';
import { JwtAuthGuard, RolesGuard } from '#common/guards/jwt-auth.guard.js';
import { LoggerInterceptor } from '#common/interceptors/logger.interceptor.js';
import { AuthModule } from '#modules/auth/auth.module.js';
import { HealthModule } from '#modules/health/health.module.js';

/**
 * Módulo raíz de Medios AeA.
 *
 * El orden de los providers globales importa: el guard de JWT se ejecuta
 * antes que el de roles, y el filtro de excepciones envuelve todo.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    AuthModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggerInterceptor },
  ],
})
export class AppModule {}
