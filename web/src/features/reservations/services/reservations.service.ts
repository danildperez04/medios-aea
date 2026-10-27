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
  /** Quién propone quien solicita que conduzca (RN-15). */
  proposedDriver: { id: string; fullName: string } | null;
  /** Lo que la coordinación asignó al aprobar (HU-11). */
  assignment: {
    id: string;
    resource: { id: string; name: string; identifier: string };
    driver: { id: string; fullName: string } | null;
  } | null;
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

export interface ResourceOption {
  id: string;
  name: string;
  identifier: string;
  passengerCapacity: number | null;
}

export type ResourceUnavailableReason = 'MAINTENANCE' | 'CAPACITY' | 'BLOCKED' | 'BUSY';
export type DriverUnavailableReason = 'INACTIVE' | 'LICENSE_EXPIRED' | 'BUSY';

export interface ApprovalOptions {
  resources: {
    available: ResourceOption[];
    unavailable: { resource: ResourceOption; reasons: ResourceUnavailableReason[] }[];
  };
  drivers: {
    available: { id: string; fullName: string }[];
    unavailable: { driver: { id: string; fullName: string }; reasons: DriverUnavailableReason[] }[];
  };
}

/** Medios y conductores libres en el horario de la solicitud (sugerencias de HU-11). */
export function useApprovalOptions(reservation: Reservation | null) {
  const range = reservation ? { from: reservation.startsAt, to: reservation.endsAt } : null;
  return useQuery({
    queryKey: ['approval-options', reservation?.id],
    enabled: reservation !== null,
    queryFn: async (): Promise<ApprovalOptions> => {
      const [resources, drivers] = await Promise.all([
        api.get<ApprovalOptions['resources']>('/availability', {
          params: {
            ...range,
            type: reservation?.resourceType,
            passengers: reservation?.passengers,
          },
        }),
        api.get<ApprovalOptions['drivers']>('/availability/drivers', { params: range }),
      ]);
      return { resources: resources.data, drivers: drivers.data };
    },
  });
}

/** Aprueba asignando medio y conductor (HU-11); sin `driverId`, el propuesto. */
export function useApproveReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; resourceId: string; driverId?: string }) =>
      (await api.post<Reservation>(`/reservations/${id}/approve`, body)).data,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: KEY }),
        queryClient.invalidateQueries({ queryKey: ['agenda'] }),
        queryClient.invalidateQueries({ queryKey: ['approval-options'] }),
      ]),
  });
}
