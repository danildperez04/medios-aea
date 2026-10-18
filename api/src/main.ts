import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Cabeceras HTTP seguras. CSP se relaja lo justo para que Swagger UI cargue
  // sus estilos en línea.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsOrigins = config
    .get<string>('CORS_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // El prefijo global hace que las rutas se sirvan en /api/v1/* (ver docs/05 §1).
  app.setGlobalPrefix(config.get<string>('API_PREFIX', 'api/v1'));

  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta campos que el DTO no declara: evita mass assignment.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Medios AeA API')
    .setDescription(
      'API de gestión de medios de la Fundación Ayuda en Acción: flota, solicitudes de ' +
        'vehículo, aprobación sin choques de horario, bitácora de viajes y reportes.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addTag('Autenticación', 'Inicio de sesión y cambio de contraseña')
    .addTag('Salud', 'Estado del servicio')
    .addTag('Usuarios', 'Personal con acceso al sistema (solo ADMIN)')
    .addTag('Proyectos', 'Proyectos a los que se cargan los viajes')
    .addTag('Vehículos', 'Vehículos de la flota (medios de tipo VEHICLE)')
    .addTag('Conductores', 'Conductores y vencimiento de licencias')
    .addTag('Bloqueos', 'Periodos en que un medio no se puede usar')
    .addTag('Disponibilidad', 'Medios y conductores libres; agenda')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  logger.log(`API escuchando en http://localhost:${port}/${config.get('API_PREFIX', 'api/v1')}`);
  logger.log(`Documentación en http://localhost:${port}/api/docs`);
  logger.log(`Entorno: ${config.get('NODE_ENV', 'development')}`);
}

void bootstrap();
