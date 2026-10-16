import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuración de Expo. Reemplaza a app.json para poder decidir según el entorno.
 *
 * EXPO_PUBLIC_API_URL (la fija cada perfil de eas.json) es la URL de la API que
 * usará el APK, p. ej. `http://192.168.1.50/api/v1` o `https://medios-aea.onrender.com/api/v1`.
 *
 * Android bloquea el HTTP sin cifrar en los builds de release. Mientras no haya
 * dominio con HTTPS, el piloto en la red de la fundación necesita permitirlo: se
 * activa SOLO cuando la URL de la API empieza con `http://`. Con HTTPS queda
 * desactivado, que es lo seguro.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
const allowCleartext = apiUrl.startsWith('http://');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Medios AeA',
  slug: 'medios-aea',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'mediosaea',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'org.mediosaea.app',
  },
  android: {
    package: 'org.mediosaea.app',
    adaptiveIcon: {
      backgroundColor: '#1F5F7A',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    '@react-native-community/datetimepicker',
    ['expo-notifications', { color: '#1F5F7A' }],
    ['expo-build-properties', { android: { usesCleartextTraffic: allowCleartext } }],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: apiUrl || null,
    // `eas init` agrega aquí el projectId de la cuenta de Expo:
    // eas: { projectId: '...' },
  },
});
