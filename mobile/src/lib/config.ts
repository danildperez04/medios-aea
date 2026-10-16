import Constants from 'expo-constants';

/**
 * URL base de la API.
 *
 * En desarrollo el teléfono no puede usar `localhost` (apunta al propio
 * teléfono), así que se toma la IP de la máquina que sirve Metro. En producción
 * se fija con EXPO_PUBLIC_API_URL al compilar con EAS.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:3000/api/v1`;
}

export const API_URL = resolveApiUrl();
