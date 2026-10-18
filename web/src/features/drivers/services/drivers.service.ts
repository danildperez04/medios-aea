import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/services/api';
import type { Paginated } from '@/shared/types/api';

export type LicenseStatus = 'VALID' | 'EXPIRING' | 'EXPIRED';

export interface Driver {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  licenseNumber: string;
  licenseExpiry: string;
  licenseStatus: LicenseStatus;
  isActive: boolean;
}

export interface DriverFilters {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  expiringWithinDays?: number;
}

export interface DriverInput {
  userId?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  isActive?: boolean;
}

const KEY = ['drivers'] as const;

export function useDrivers(filters: DriverFilters) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  );
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => (await api.get<Paginated<Driver>>('/drivers', { params })).data,
    placeholderData: keepPreviousData,
  });
}

export function useSaveDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: DriverInput }) =>
      id
        ? (await api.patch<Driver>(`/drivers/${id}`, input)).data
        : (await api.post<Driver>('/drivers', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
