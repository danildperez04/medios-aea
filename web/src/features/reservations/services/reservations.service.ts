import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/services/api';
import type { RequestStatus } from '@/design-system/ui';
import type { Paginated } from '@/shared/types/api';

export interface Reservation {
  id: string;
  code: string;
  status: RequestStatus;
  purpose: string;
  destination: string;
  passengers: number;
  startsAt: string;
  endsAt: string;
  resourceType: 'VEHICLE' | 'EQUIPMENT';
  project: { id: string; code: string; name: string };
  requester: { id: string; fullName: string };
  preferredResource: { id: string; name: string; identifier: string } | null;
  rejectionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ReservationFilters {
  page: number;
  limit: number;
  status?: RequestStatus;
  search?: string;
}

const KEY = ['reservations'] as const;

export function useReservations(filters: ReservationFilters) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  );
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => (await api.get<Paginated<Reservation>>('/reservations', { params })).data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
}

/** Cuántas solicitudes esperan decisión; alimenta el contador del menú. */
export function usePendingCount(enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'pending-count'],
    queryFn: async () =>
      (
        await api.get<Paginated<Reservation>>('/reservations', {
          params: { status: 'PENDING', limit: 1 },
        })
      ).data.total,
    refetchInterval: 60_000,
    enabled,
  });
}

/** Cancela una solicitud pendiente o aprobada (HU-10); si estaba aprobada, libera el medio. */
export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<Reservation>(`/reservations/${id}/cancel`)).data,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: KEY }),
        queryClient.invalidateQueries({ queryKey: ['agenda'] }),
      ]),
  });
}
