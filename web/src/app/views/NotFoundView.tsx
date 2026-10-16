import { Link as RouterLink } from 'react-router-dom';
import { Box, Button } from '@mui/material';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/design-system/ui';

/** Pantalla 404. Siempre ofrece el camino de vuelta. */
export function NotFoundView() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <EmptyState
        icon={Compass}
        title="Página no encontrada"
        description="La dirección que buscas no existe o cambió de lugar."
        action={
          <Button variant="contained" component={RouterLink} to="/">
            Ir al inicio
          </Button>
        }
      />
    </Box>
  );
}
