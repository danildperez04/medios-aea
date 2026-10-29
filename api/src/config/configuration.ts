// joi es CommonJS: en ESM hay que importar el default, no el namespace.
// Con `import * as Joi` el namespace solo trae `default` y Joi.string no existe.
import Joi from 'joi';

/**
 * Niveles de log admitidos.
 * `silent` se usa en las pruebas; `info` es el valor por defecto y el que trae
 * el .env de ejemplo. La lista vive en un solo sitio para que el esquema Joi y
 * `buildConfig` no puedan discrepar.
 */
export const LOG_LEVELS = ['silent', 'error', 'warn', 'log', 'info', 'debug', 'verbose'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** Forma del archivo .env, ya validada. */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  logLevel: LogLevel;
  database: {
    /** URL completa (`postgres://user:pass@host:5432/db`). La entregan los PaaS. */
    url: string | null;
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    synchronize: boolean;
    logging: boolean;
    ssl: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bcryptRounds: number;
  corsOrigin: string[];
}

/**
 * Lee una variable de entorno obligatoria.
 * Falla al arrancar si falta, en vez de fallar en caliente durante una petición.
 */
function requiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
  }
  return value;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  return raw.toLowerCase() === 'true';
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`La variable ${key} debe ser numérica, recibido: ${raw}`);
  }
  return parsed;
}

/**
 * Construye la configuración a partir de process.env.
 *
 * La base se indica de dos formas: con `DATABASE_URL` (Render, Railway y otros
 * PaaS la inyectan) o con las variables sueltas DATABASE_HOST/NAME/USER/PASSWORD
 * (Docker Compose en un servidor propio). Si hay URL, manda la URL.
 */
export function buildConfig(): AppConfig {
  const url = process.env.DATABASE_URL?.trim() || null;
  const fromParts = (key: string): string => (url ? (process.env[key] ?? '') : requiredEnv(key));
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: envNumber('PORT', 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    logLevel: (process.env.LOG_LEVEL ?? 'info') as LogLevel,
    database: {
      url,
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: envNumber('DATABASE_PORT', 5432),
      name: fromParts('DATABASE_NAME'),
      user: fromParts('DATABASE_USER'),
      password: fromParts('DATABASE_PASSWORD'),
      // `synchronize` solo puede ser true sobre una base desechable de pruebas.
      synchronize: envBool('DATABASE_SYNCHRONIZE', false),
      logging: envBool('DATABASE_LOGGING', false),
      ssl: envBool('DATABASE_SSL', false),
    },
    jwt: {
      secret: requiredEnv('JWT_SECRET'),
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    },
    bcryptRounds: envNumber('BCRYPT_ROUNDS', 12),
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  };
}

const requiredWithoutUrl = Joi.string().when('DATABASE_URL', {
  is: Joi.exist(),
  then: Joi.optional(),
  otherwise: Joi.required(),
});

/**
 * Esquema de validación que ejecuta @nestjs/config al arrancar.
 * Mensajes en español porque es el idioma del equipo y de la interfaz.
 */
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  LOG_LEVEL: Joi.string()
    .valid(...LOG_LEVELS)
    .default('info'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }),
  // Sin DATABASE_URL, las variables sueltas son obligatorias.
  DATABASE_HOST: requiredWithoutUrl,
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_NAME: requiredWithoutUrl,
  DATABASE_USER: requiredWithoutUrl,
  DATABASE_PASSWORD: requiredWithoutUrl,
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  DATABASE_SSL: Joi.boolean().default(false),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
  // Sesión del panel web (ADR 0003): token de acceso corto en memoria y refresh token
  // en cookie HttpOnly que vence tras estas horas sin uso.
  WEB_ACCESS_TOKEN_TTL: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  REFRESH_TOKEN_TTL_HOURS: Joi.number().integer().min(1).max(720).default(12),
  // `Secure` en la cookie: siempre en producción (HTTPS detrás de nginx).
  COOKIE_SECURE: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().default(true),
    otherwise: Joi.boolean().default(false),
  }),
  BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),
  // La documentación interactiva expone todos los endpoints: apagada en producción
  // salvo que se pida expresamente.
  SWAGGER_ENABLED: Joi.boolean().when('NODE_ENV', {
    is: 'production',
    then: Joi.boolean().default(false),
    otherwise: Joi.boolean().default(true),
  }),
});
