import * as SecureStore from 'expo-secure-store';

/**
 * Los tokens se guardan cifrados en el llavero del sistema (Keychain en iOS, Keystore
 * en Android), nunca en AsyncStorage en texto plano (HU-16). Van en dos claves porque
 * SecureStore limita el tamaño de cada valor.
 */
const ACCESS_KEY = 'medios-aea.access-token';
const REFRESH_KEY = 'medios-aea.refresh-token';

/** Token de acceso (15 min) y refresh token con el que se renueva (HU-28). */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  /** null si no hay sesión guardada o le falta una de las dos partes. */
  async get(): Promise<SessionTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },
  async set(tokens: SessionTokens): Promise<void> {
    // Primero el refresh token: es el que no se puede volver a pedir si la app se cierra
    // a mitad de la escritura.
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
  },
  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};
