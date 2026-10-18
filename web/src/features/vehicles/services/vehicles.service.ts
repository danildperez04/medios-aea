import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/services/api';
import type { Paginated } from '@/shared/types/api';

export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';
export type FuelType = 'GASOLINE' | 'DIESEL';
export type BlackoutReason = 'MAINTENANCE' | 'ADMINISTRATIVE' | 'OTHER';

export interface Vehicle {
  id: string;
  name: string;
  status: ResourceStatus;
  notes: string | null;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  passengerCapacity: number;
  fuelType: FuelType;
  currentOdometer: number;
}

export interface VehicleInput {
  name: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  passengerCapacity: number;
  fuelType: FuelType;
  currentOdometer: number;
  notes: string | null;
  status?: ResourceStatus;
}

export interface Blackout {
  id: string;
  resourceId: string;
  startsAt: string;
  endsAt: string;
  reason: BlackoutReason;
  description: string | null;
}

export interface BlackoutInput {
  startsAt: string;
  endsAt: string;
  reason: BlackoutReason;
  description: string | null;
}

export interface VehicleFilters {
  page: number;
  limit: number;
  search?: string;
  status?: ResourceStatus;
}

const KEY = ['vehicles'] as const;

export function useVehicles(filters: VehicleFilters) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  );
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => (await api.get<Paginated<Vehicle>>('/vehicles', { params })).data,
    placeholderData: keepPreviousData,
  });
}

/** Al cambiar la flota también cambia la agenda: se invalidan ambas. */
function useInvalidateFleet() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: KEY }),
      queryClient.invalidateQueries({ queryKey: ['agenda'] }),
      queryClient.invalidateQueries({ queryKey: ['blackouts'] }),
    ]);
}

export function useSaveVehicle() {
  const invalidate = useInvalidateFleet();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: Partial<VehicleInput> }) =>
      id
        ? (await api.patch<Vehicle>(`/vehicles/${id}`, input)).data
        : (await api.post<Vehicle>('/vehicles', input)).data,
    onSuccess: invalidate,
  });
}

export function useBlackouts(resourceId: string | null) {
  return useQuery({
    queryKey: ['blackouts', resourceId],
    queryFn: async () => (await api.get<Blackout[]>(`/resources/${resourceId}/blackouts`)).data,
    enabled: resourceId !== null,
  });
}

export function useCreateBlackout() {
  const invalidate = useInvalidateFleet();
  return useMutation({
    mutationFn: async ({ resourceId, input }: { resourceId: string; input: BlackoutInput }) =>
      (await api.post<Blackout>(`/resources/${resourceId}/blackouts`, input)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteBlackout() {
  const invalidate = useInvalidateFleet();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/blackouts/${id}`)).data,
    onSuccess: invalidate,
  });
}
