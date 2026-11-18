import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export interface Notice {
  id: string;
  title: string;
  body: string;
  data: { kind?: string; reservationId?: string; audience?: string } | null;
  readAt: string | null;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
}

const KEY = ['notifications'] as const;

/** Los 50 avisos más recientes (RF-19). */
export function useNotices() {
  return useQuery({
    queryKey: [...KEY, 'list'],
    queryFn: () => apiRequest<Paginated<Notice>>('/notifications?limit=50'),
  });
}

/** Cuántos avisos sin leer hay; se revisa cada minuto con la app abierta. */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'unread'],
    queryFn: () => apiRequest<{ count: number }>('/notifications/unread-count'),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<Notice>(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ updated: number }>('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
