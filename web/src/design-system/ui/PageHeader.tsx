import { Stack, Typography } from '@mui/material';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Acciones a la derecha: botones de crear, exportar, filtrar. */
  actions?: React.ReactNode;
}

/** Encabezado estandar de pagina: titulo, descripcion y acciones. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        mb: 3,
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Stack>
      {actions ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}
