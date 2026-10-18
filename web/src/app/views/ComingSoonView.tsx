import { Typography } from '@mui/material';
import { PageHeader } from '@/design-system/ui';

export interface ComingSoonViewProps {
  title: string;
  /** Qué podrá hacerse aquí, dicho para quien usa el panel. */
  description: string;
}

/** Sección que todavía no está disponible. Explica qué tendrá, sin hablar de sprints. */
export function ComingSoonView({ title, description }: ComingSoonViewProps) {
  return (
    <>
      <PageHeader title={title} />
      <Typography sx={{ maxWidth: '60ch' }}>{description}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Esta sección todavía no está disponible.
      </Typography>
    </>
  );
}
