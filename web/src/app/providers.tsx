import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { theme } from '@/design-system/theme/theme';

/**
 * Proveedores globales.
 *
 * El QueryClient se crea dentro del componente y no como constante de modulo:
 * crearlo en el modulo hace que dos mounted compartan cache al hot-reload,
 * y los datos de un usuario se filtrarian al siguiente.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // La agenda cambia cuando otro admin aprueba: 30 s es un buen equilibrio.
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
