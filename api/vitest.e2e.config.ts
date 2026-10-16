import { defineConfig } from 'vitest/config';
import base from './vitest.config.ts';

/**
 * Configuracion de las pruebas de integracion (Supertest contra la API real y
 * un PostgreSQL de pruebas). Se separan de las unitarias porque requieren la
 * base de datos levantada y son mas lentas.
 *
 * No se usa `mergeConfig`: concatena los arreglos y `include` terminaria
 * sumando tambien los specs unitarios.
 */
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['test/**/*.e2e-spec.ts'],
    // Las pruebas de concurrencia necesitan margen: la transaccion de
    // postgres y el bloqueo pesimista tardan mas que una operacion simple.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Secuencial: todas las suites recrean el esquema de la misma base.
    fileParallelism: false,
  },
});
