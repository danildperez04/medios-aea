import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/app/services/api';
import type { Paginated } from '@/shared/types/api';

export interface Project {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProjectFilters {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export interface ProjectInput {
  code: string;
  name: string;
}

const KEY = ['projects'] as const;

export function useProjects(filters: ProjectFilters) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  );
  return useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => (await api.get<Paginated<Project>>('/projects', { params })).data,
    placeholderData: keepPreviousData,
  });
}

export function useSaveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string;
      input: Partial<ProjectInput> & { isActive?: boolean };
    }) =>
      id
        ? (await api.patch<Project>(`/projects/${id}`, input)).data
        : (await api.post<Project>('/projects', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
