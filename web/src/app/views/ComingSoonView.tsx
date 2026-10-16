import { Construction } from 'lucide-react';
import { EmptyState, PageHeader } from '@/design-system/ui';

export interface ComingSoonViewProps {
  title: string;
  sprint: number;
}

/** Marcador de una sección que aún no se implementa (ver docs/04-plan-scrum.md). */
export function ComingSoonView({ title, sprint }: ComingSoonViewProps) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={Construction}
        title="Sección en construcción"
        description={`Esta sección llega en el Sprint ${sprint}.`}
      />
    </>
  );
}
