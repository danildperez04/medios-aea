// @ts-check
/**
 * Configuración de ESLint del backend (flat config, ESLint 10).
 * El orden importa: las reglas de estilo se desactivan al final,
 * después de que Prettier haya frownedado el formateo.
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.js'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: {
        // Un tsconfig dedicado para ESLint que cubre src, test y las
        // configuraciones. tsconfig.json no sirve porque excluye los specs y
        // la carpeta test/ (no entran al build), y projectService solo mira el
        // tsconfig mas cercano, asi que se fija el proyecto de forma explicita.
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
      'no-return-await': 'error',
    },
  },
  {
    // Pruebas: no exigen tipos de retorno explicitos ni Limpiar la consola.
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
    },
  },
  {
    // El script de creacion de administrador interactua por consola: ahi el
    // console ES la interfaz, no un descuido.
    files: ['src/database/scripts/**/*.ts', 'src/database/seeders/*.cli.ts'],
    rules: { 'no-console': 'off' },
  },
  eslintConfigPrettier,
);
