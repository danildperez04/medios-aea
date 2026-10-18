import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/services/api';
import type { UserRole } from '@/app/stores/auth.store';
import type { Paginated } from '@/shared/types/api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  password: string;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & { isActive?: boolean };

const KEY = ['users'] as const;

/** Quita los filtros vacíos para no mandar `search=` a la API. */
function clean<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  ) as Partial<T>;
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params: clean(filters) })).data,
    placeholderData: keepPreviousData,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => (await api.post<User>('/users', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateUserInput }) =>
      (await api.patch<User>(`/users/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) =>
      (await api.patch<{ message: string }>(`/users/${id}/password`, { password })).data,
  });
}
