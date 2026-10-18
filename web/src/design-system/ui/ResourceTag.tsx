import { Box } from '@mui/material';

/** Tipos de medio. En el MVP solo hay vehículos; la fase 2 agrega equipos. */
export type ResourceKind = 'VEHICLE' | 'EQUIPMENT';

const KIND_LABEL: Record<ResourceKind, string> = {
  VEHICLE: 'Vehículo',
  EQUIPMENT: 'Equipo',
};

export interface ResourceTagProps {
  kind: ResourceKind;
  /** Placa para un vehículo, código de inventario para un equipo. */
  identifier: string;
  /** Nombre corto: "Hilux blanca", "Proyector Epson". */
  name?: string;
  /** `stacked`: identificador arriba y nombre abajo, para columnas angostas. */
  layout?: 'inline' | 'stacked';
}

/**
 * Identificador de un medio, igual para cualquier tipo: la credencial que lo
 * distingue (placa o código) en DM Mono, como pide el manual para los datos
 * técnicos, y su nombre en la tipografía principal.
 */
export function ResourceTag({ kind, identifier, name, layout = 'inline' }: ResourceTagProps) {
  const stacked = layout === 'stacked';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        flexDirection: stacked ? 'column' : 'row',
        alignItems: stacked ? 'flex-start' : 'baseline',
        gap: stacked ? 0.25 : 1,
        minWidth: 0,
        maxWidth: '100%',
      }}
      title={`${KIND_LABEL[kind]} ${identifier}`}
    >
      <Box
        component="span"
        className="tabular"
        sx={{
          px: 0.75,
          py: 0.125,
          border: '1.5px solid',
          borderColor: 'text.primary',
          borderRadius: '3px',
          fontSize: '0.8rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        <Box
          component="span"
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
          }}
        >
          {KIND_LABEL[kind]}{' '}
        </Box>
        {identifier}
      </Box>
      {name ? (
        <Box
          component="span"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            fontSize: stacked ? '0.875rem' : undefined,
          }}
        >
          {name}
        </Box>
      ) : null}
    </Box>
  );
}
