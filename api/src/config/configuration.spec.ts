import { describe, expect, it } from 'vitest';
import { buildConfig, configValidationSchema } from './configuration.js';

/**
 * Pruebas de la configuracion.
 *
 * La configuracion se valida al arrancar: si falta una variable obligatoria o
 * el secreto JWT es corto, la API no debe levantarse. Fallar al iniciar es
 * mucho mejor que fallar en caliente durante la primera peticion.
 */

const BASE_ENV = {
  DATABASE_HOST: 'localhost',
  DATABASE_NAME: 'medios_aea',
  DATABASE_USER: 'medios_aea',
  DATABASE_PASSWORD: 'secreto',
  JWT_SECRET: 'a'.repeat(64),
} as const;

function withEnv(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const previous = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return previous;
}

describe('buildConfig', () => {
  it('devuelve la configuracion con los valores por defecto', () => {
    // BCRYPT_ROUNDS lo fija el setup de pruebas a 4 para acelerar los hashes.
    const previous = withEnv({
      ...BASE_ENV,
      PORT: undefined,
      API_PREFIX: undefined,
      BCRYPT_ROUNDS: undefined,
    });

    try {
      const config = buildConfig();
      expect(config.port).toBe(3000);
      expect(config.apiPrefix).toBe('api/v1');
      expect(config.bcryptRounds).toBe(12);
    } finally {
      process.env = previous;
    }
  });

  it('exige la variable DATABASE_NAME', () => {
    const previous = withEnv({ ...BASE_ENV, DATABASE_NAME: undefined });

    try {
      expect(() => buildConfig()).toThrow(/DATABASE_NAME/);
    } finally {
      process.env = previous;
    }
  });

  it('exige la variable JWT_SECRET', () => {
    const previous = withEnv({ ...BASE_ENV, JWT_SECRET: undefined });

    try {
      expect(() => buildConfig()).toThrow(/JWT_SECRET/);
    } finally {
      process.env = previous;
    }
  });

  it('rechaza un puerto que no es numerico', () => {
    const previous = withEnv({ ...BASE_ENV, PORT: 'no-es-un-puerto' });

    try {
      expect(() => buildConfig()).toThrow(/PORT/);
    } finally {
      process.env = previous;
    }
  });

  it('descompone CORS_ORIGIN en una lista de origenes', () => {
    const previous = withEnv({
      ...BASE_ENV,
      CORS_ORIGIN: 'https://medios.org, https://admin.medios.org',
    });

    try {
      const config = buildConfig();
      expect(config.corsOrigin).toEqual(['https://medios.org', 'https://admin.medios.org']);
    } finally {
      process.env = previous;
    }
  });

  it('deja synchronize desactivado salvo que se pida expresamente', () => {
    const previous = withEnv({ ...BASE_ENV, DATABASE_SYNCHRONIZE: undefined });

    try {
      expect(buildConfig().database.synchronize).toBe(false);
    } finally {
      process.env = previous;
    }
  });
});

describe('DATABASE_URL (PaaS)', () => {
  const URL_ENV = {
    DATABASE_URL: 'postgres://aea:secreto@db.interno:5432/medios',
    DATABASE_HOST: undefined,
    DATABASE_NAME: undefined,
    DATABASE_USER: undefined,
    DATABASE_PASSWORD: undefined,
    JWT_SECRET: 'a'.repeat(64),
  };

  it('con la URL no exige las variables sueltas', () => {
    const previous = withEnv(URL_ENV);
    try {
      expect(buildConfig().database.url).toBe('postgres://aea:secreto@db.interno:5432/medios');
    } finally {
      process.env = previous;
    }
  });

  it('sin URL vuelve a exigir DATABASE_NAME', () => {
    const previous = withEnv({ ...URL_ENV, DATABASE_URL: undefined });
    try {
      expect(() => buildConfig()).toThrow(/DATABASE_NAME/);
    } finally {
      process.env = previous;
    }
  });

  it('el esquema acepta solo la URL', () => {
    const { error } = configValidationSchema.validate({
      DATABASE_URL: 'postgresql://aea:secreto@db.interno:5432/medios',
      JWT_SECRET: 'a'.repeat(64),
    });
    expect(error).toBeUndefined();
  });

  it('el esquema rechaza una URL que no es de PostgreSQL', () => {
    const { error } = configValidationSchema.validate({
      DATABASE_URL: 'mysql://aea:secreto@db:3306/medios',
      JWT_SECRET: 'a'.repeat(64),
    });
    expect(error).toBeDefined();
  });

  it('el esquema exige las variables sueltas si no hay URL', () => {
    const { error } = configValidationSchema.validate({ JWT_SECRET: 'a'.repeat(64) });
    expect(error?.message).toMatch(/DATABASE_HOST/);
  });
});

describe('SWAGGER_ENABLED', () => {
  const swagger = (env: Record<string, string>) =>
    configValidationSchema.validate({ ...BASE_ENV, ...env }).value.SWAGGER_ENABLED as boolean;

  it('esta activo por defecto en desarrollo y pruebas', () => {
    expect(swagger({ NODE_ENV: 'development' })).toBe(true);
    expect(swagger({ NODE_ENV: 'test' })).toBe(true);
  });

  it('esta apagado por defecto en produccion', () => {
    expect(swagger({ NODE_ENV: 'production' })).toBe(false);
  });

  it('se puede activar a proposito en produccion', () => {
    expect(swagger({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
  });
});

describe('configValidationSchema', () => {
  const base = { ...BASE_ENV };

  it('acepta una configuracion completa valida', () => {
    const { error } = configValidationSchema.validate(base);
    expect(error).toBeUndefined();
  });

  it('rechaza un JWT_SECRET de menos de 32 caracteres', () => {
    const { error } = configValidationSchema.validate({ ...base, JWT_SECRET: 'corto' });
    expect(error).toBeDefined();
  });

  it('rechaza un NODE_ENV desconocido', () => {
    const { error } = configValidationSchema.validate({ ...base, NODE_ENV: 'produccion' });
    expect(error).toBeDefined();
  });

  it('acepta un puerto valido', () => {
    const { error } = configValidationSchema.validate({ ...base, PORT: 8080 });
    expect(error).toBeUndefined();
  });
});

/**
 * Este caso existe por un fallo real: `import * as Joi from 'joi'` compila y las
 * pruebas de Vitest lo toleran, pero al ejecutar en Node ESM el namespace solo
 * expone `default` y la aplicacion revienta con "Joi.string is not a function".
 * El esquema debe construirse en el momento de importar, no dentro de un test.
 */
describe('esquema de validacion al cargar el modulo', () => {
  it('expone un esquema de Joi funcional', () => {
    expect(typeof configValidationSchema.validate).toBe('function');
    expect(configValidationSchema.validate({}).error).toBeDefined();
  });
});

/**
 * El .env de ejemplo trae LOG_LEVEL=info. Si el esquema no acepta `info`, la
 * aplicacion no arranca con su propia configuracion documentada.
 */
describe('niveles de log admitidos', () => {
  it('acepta el nivel info que trae el .env de ejemplo', () => {
    const { error } = configValidationSchema.validate({ ...BASE_ENV, LOG_LEVEL: 'info' });
    expect(error).toBeUndefined();
  });

  it('acepta silent, usado por las pruebas', () => {
    const { error } = configValidationSchema.validate({ ...BASE_ENV, LOG_LEVEL: 'silent' });
    expect(error).toBeUndefined();
  });

  it('rechaza un nivel inexistente', () => {
    const { error } = configValidationSchema.validate({ ...BASE_ENV, LOG_LEVEL: 'muyverboso' });
    expect(error).toBeDefined();
  });
});
