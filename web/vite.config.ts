import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Configuración de Vite.
 *
 * El alias `@` apunta a `src`, igual que en tsconfig.app.json, para que las
 * rutas relativas largas no sean necesarias.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    // En desarrollo el frontend habla con la API a través del proxy, de modo
    // que el navegador nunca cruza de origen y el CORS queda como red de
    // seguridad, no como requisito.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 4173, host: true },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // El HTML cambia su hash cuando cambia el bundle, así que se cachea poco
    // tiempo. Los assets con hash sí se cachean un año (ver nginx.conf).
    rollupOptions: {
      output: {
        // Vite 8 / Rollup 4 espera una funcion. Separar las bibliotecas
        // pesadas evita que un cambio en el codigo de la app invalide su cache.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router)/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/]@mui[\\/]/.test(id)) return 'mui';
          if (id.includes('@tanstack')) return 'query';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text-summary', 'json-summary', 'lcov', 'html'],
      // Valor medido el 18/10/2026 redondeado hacia abajo: es bajo y solo puede
      // subir. Cada pantalla nueva entra con sus pruebas (docs/12-plan-pruebas.md).
      thresholds: { statements: 21, branches: 17, functions: 18, lines: 21 },
    },
  },
});
