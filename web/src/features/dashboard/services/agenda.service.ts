import { useQuery } from '@tanstack/react-query';
import { api } from '@/app/services/api';
import type { AgendaBlockState, AgendaRow, ResourceKind } from '@/design-system/ui';

interface AgendaResponse {
  from: string;
  to: string;
  rows: {
    id: string;
    type: ResourceKind;
    name: string;
    status: 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE';
    identifier: string;
    blocks: { id: string; start: string; end: string; state: AgendaBlockState; label: string }[];
  }[];
}

/** Agenda de todos los medios en un rango (RF-16), ya en el formato del tablero. */
export function useAgenda(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ['agenda', range],
    queryFn: async () => (await api.get<AgendaResponse>('/agenda', { params: range })).data,
    select: (data): AgendaRow[] =>
      data.rows.map((row) => ({
        id: row.id,
        kind: row.type,
        identifier: row.identifier,
        name: row.name,
        blocks: row.blocks,
      })),
    // La agenda cambia cuando otra persona aprueba o bloquea: se refresca sola.
    refetchInterval: 60_000,
  });
}
