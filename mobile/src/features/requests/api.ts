import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { managuaIso } from '@/lib/managua';
import type { NewRequestInput } from './schema';

export interface ProjectOption {
  id: string;
  code: string;
  name: string;
}

export interface DriverOption {
  id: string;
  userId: string;
  fullName: string;
}

export interface VehicleSummary {
  id: string;
  name: string;
  identifier: string;
  passengerCapacity: number | null;
}

export interface Availability {
  available: VehicleSummary[];
  unavailable: { resource: VehicleSummary; reasons: string[] }[];
}

export interface CreatedRequest {
  id: string;
  code: string;
}

interface Paginated<T> {
  data: T[];
}

/** Proyectos activos a los que se puede cargar un viaje. */
export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'active'],
    queryFn: async () =>
      (await apiRequest<Paginated<ProjectOption>>('/projects?isActive=true&limit=100')).data,
    staleTime: 5 * 60_000,
  });
}

/** Personas con licencia vigente que pueden conducir (RN-15). */
export function useDriverOptions() {
  return useQuery({
    queryKey: ['drivers', 'options'],
    queryFn: () => apiRequest<DriverOption[]>('/drivers/options'),
    staleTime: 5 * 60_000,
  });
}

export interface AvailabilityQuery {
  date: string;
  startTime: string;
  endTime: string;
  passengers: number;
}

/**
 * Vehículos libres en el horario y con espacio para las personas (RF-09). Solo
 * orienta: una solicitud pendiente no reserva nada y la coordinación decide al aprobar
 * (RN-07). `null` mientras el horario no sea válido.
 */
export function useAvailability(query: AvailabilityQuery | null) {
  return useQuery({
    queryKey: ['availability', query],
    enabled: query !== null,
    queryFn: () => {
      const { date, startTime, endTime, passengers } = query as AvailabilityQuery;
      const params = new URLSearchParams({
        from: managuaIso(date, startTime),
        to: managuaIso(date, endTime),
        type: 'VEHICLE',
        passengers: String(passengers),
      });
      return apiRequest<Availability>(`/availability?${params.toString()}`);
    },
    staleTime: 30_000,
  });
}

/** Envía la solicitud; queda pendiente y avisa a la coordinación (RF-10). */
export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewRequestInput) =>
      apiRequest<CreatedRequest>('/reservations', {
        method: 'POST',
        body: {
          projectId: input.projectId,
          purpose: input.purpose.trim(),
          destination: input.destination.trim(),
          passengers: input.passengers,
          startsAt: managuaIso(input.date, input.startTime),
          endsAt: managuaIso(input.date, input.endTime),
          resourceType: 'VEHICLE',
          proposedDriverId: input.driverId,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  });
}
