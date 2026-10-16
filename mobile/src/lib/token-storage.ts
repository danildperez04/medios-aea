import * as SecureStore from 'expo-secure-store';

/**
 * El token JWT se guarda cifrado en el llavero del sistema (Keychain en iOS,
 * Keystore en Android), nunca en AsyncStorage en texto plano (HU-16).
 */
const TOKEN_KEY = 'medios-aea.access-token';

export const tokenStorage = {
  get: (): Promise<string | null> => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string): Promise<void> => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: (): Promise<void> => SecureStore.deleteItemAsync(TOKEN_KEY),
};
