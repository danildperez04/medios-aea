import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokenStorage } from '@/lib/token-storage';
import { useSession } from '@/store/session';

/** Raíz de la app: proveedores globales y lectura del token guardado. */
export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: 0 } },
      }),
  );
  const markReady = useSession((state) => state.markReady);

  useEffect(() => {
    tokenStorage
      .get()
      .then(markReady)
      .catch(() => markReady(null));
  }, [markReady]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
