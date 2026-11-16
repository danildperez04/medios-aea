import { useQuery } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { fetchMe, logout } from '@/features/auth/api';
import { ProfileUnavailable } from '@/features/auth/ProfileUnavailable';
import { useSession } from '@/store/session';

/**
 * Zona autenticada. Sin token vuelve al login; con token pide el perfil para
 * saber el rol (técnico o conductor) y mostrar las pantallas que le tocan.
 *
 * Si el token de acceso venció, el cliente HTTP renueva la sesión solo. Si la API
 * rechaza también la renovación, cierra la sesión y esta pantalla redirige al login. Cualquier otro fallo (sin señal, servidor caído) no
 * cierra la sesión: se explica y se deja reintentar.
 */
export default function AppLayout() {
  const { token, user, setUser } = useSession();
  const me = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe, enabled: Boolean(token) });

  useEffect(() => {
    if (me.data) setUser(me.data);
  }, [me.data, setUser]);

  if (!token) return <Redirect href="/login" />;
  if (!user) {
    if (me.isError) {
      return (
        <ProfileUnavailable
          message={me.error.message}
          retrying={me.isFetching}
          onRetry={() => void me.refetch()}
          onLogout={() => void logout()}
        />
      );
    }
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" accessibilityLabel="Abriendo tu sesión" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
