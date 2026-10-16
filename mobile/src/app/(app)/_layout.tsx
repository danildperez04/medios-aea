import { useQuery } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { fetchMe } from '@/features/auth/api';
import { useSession } from '@/store/session';

/**
 * Zona autenticada. Sin token vuelve al login; con token pide el perfil para
 * saber el rol (técnico o conductor) y mostrar las pantallas que le tocan.
 */
export default function AppLayout() {
  const { token, user, setUser } = useSession();
  const me = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchMe, enabled: Boolean(token) });

  useEffect(() => {
    if (me.data) setUser(me.data);
  }, [me.data, setUser]);

  if (!token) return <Redirect href="/login" />;
  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
