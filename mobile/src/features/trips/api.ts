import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

export type TripState = 'UPCOMING' | 'IN_PROGRESS' | 'FINISHED';

/** Un viaje que la persona conduce (`TripView` de la API, HU-20). */
export interface Trip {
  reservationId: string;
  code: string;
  state: TripState;
  purpose: string;
  destination: string;
  passengers: number;
  startsAt: string;
  endsAt: string;
  project: { code: string; name: string };
  requester: { fullName: string; phone: string | null };
  vehicle: { name: string; identifier: string; passengerCapacity: number | null };
  log: { startedAt: string; finishedAt: string | null } | null;
}

/** Los viajes de hoy y próximos donde la persona está asignada como conductor (RN-16). */
export function useMyTrips() {
  return useQuery({
    queryKey: ['trips', 'mine'],
    queryFn: () => apiRequest<Trip[]>('/trips/mine'),
  });
}

/** Un viaje propio, por el id de su solicitud. */
export function useMyTrip(reservationId: string) {
  return useQuery({
    queryKey: ['trips', 'detail', reservationId],
    queryFn: () => apiRequest<Trip>(`/trips/mine/${reservationId}`),
  });
}
