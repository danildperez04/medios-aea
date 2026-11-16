import type { QueryClient } from '@tanstack/react-query';
import { useSession } from '@/store/session';

/**
 * Vacía la caché de datos cuando termina la sesión, sea por cierre manual o porque
 * el servidor rechazó el token: lo que vio una persona no debe aparecerle a la
 * siguiente que use el teléfono. Devuelve la función que deja de escuchar.
 */
export function clearCacheOnSessionEnd(queryClient: QueryClient): () => void {
  return useSession.subscribe((state, previous) => {
    if (previous.token && !state.token) queryClient.clear();
  });
}
