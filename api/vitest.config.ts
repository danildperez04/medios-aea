import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vitest del backend.
 *
 * El proyecto es ESM de punta a punta (NestJS 12 es ESM puro y TypeScript 6 ya
 * no compila a CommonJS con `moduleResolution` clasico), asi que Vitest resuelve
 * los `.js` y los alias igual que hace Vite en el frontend, sin banderas de
 * Node ni transformadores extra.
 */
export default defineConfig({
  resolve: {
    alias: {
      '#config': fileURLToPath(new URL('./src/config', import.meta.url)),
      '#common': fileURLToPath(new URL('./src/common', import.meta.url)),
      '#database': fileURLToPath(new URL('./src/database', import.meta.url)),
      '#modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup-env.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/entities/**',
        'src/config/**',
        'src/main.ts',
        'src/database/data-source.ts',
        'src/database/run-migrations.ts',
        'src/database/seeders/**',
        'src/database/scripts/**',
        'src/test/**',
        'src/**/*.{test,spec}.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 60,
        statements: 70,
      },
    },
  },
});
