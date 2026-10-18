import { defineConfig } from 'vitest/config';
import base from './vitest.config.ts';
import e2e from './vitest.e2e.config.ts';

/**
 * Cobertura de la API: unitarias + integración en una sola corrida.
 *
 * La mayor parte de la API se prueba contra PostgreSQL real (test/*.e2e-spec.ts):
 * medir solo las unitarias daba ~33 % y ocultaba lo que de verdad está cubierto.
 * Requiere la base de pruebas (`pnpm db:up`), igual que `test:e2e`.
 *
 * Umbrales = valor medido el 18/10/2026 redondeado hacia abajo. Solo pueden subir.
 */
export default defineConfig({
  ...base,
  test: {
    ...e2e.test,
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.e2e-spec.ts'],
    coverage: {
      ...base.test?.coverage,
      reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
      thresholds: {
        statements: 88,
        branches: 72,
        functions: 90,
        lines: 90,
      },
    },
  },
});
