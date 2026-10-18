import { Box, Typography } from '@mui/material';
import { useState } from 'react';

export interface BrandLockupProps {
  /** `sm` para el menú lateral, `lg` para la pantalla de inicio de sesión. */
  size?: 'sm' | 'lg';
}

/**
 * Marca del sistema según la "arquitectura de marca" del manual de Ayuda en
 * Acción: el logotipo de la fundación y, separado por una línea, el nombre del
 * proyecto en un nivel jerárquico inferior.
 *
 * El logotipo oficial no se redibuja: se lee de `public/brand/logo-aea.svg`. Hasta
 * que comunicación entregue ese archivo se muestra el nombre en texto, sin isotipo.
 */
export function BrandLockup({ size = 'sm' }: BrandLockupProps) {
  const [logoMissing, setLogoMissing] = useState(false);
  const large = size === 'lg';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: large ? 2 : 1.25 }}>
      {logoMissing ? (
        <Typography
          component="span"
          sx={{
            fontWeight: 500,
            lineHeight: 0.95,
            fontSize: large ? '2rem' : '1.05rem',
            letterSpacing: '-0.01em',
          }}
        >
          Ayuda
          <br />
          en Acción
        </Typography>
      ) : (
        <Box
          component="img"
          src="/brand/logo-aea.svg"
          alt="Ayuda en Acción"
          onError={() => setLogoMissing(true)}
          sx={{ height: large ? 64 : 34, width: 'auto', display: 'block' }}
        />
      )}
      <Box
        aria-hidden
        sx={{ alignSelf: 'stretch', width: '1px', bgcolor: 'currentColor', opacity: 0.8 }}
      />
      <Typography
        component="span"
        sx={{ fontSize: large ? '2rem' : '1.05rem', fontWeight: 400, lineHeight: 1 }}
      >
        Medios
      </Typography>
    </Box>
  );
}
