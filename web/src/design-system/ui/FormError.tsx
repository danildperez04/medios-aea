import { Alert } from '@mui/material';
import { CircleAlert } from 'lucide-react';

export interface FormErrorProps {
  /** Mensaje a mostrar. Si es null o vacio, no se renderiza nada. */
  message: string | null | undefined;
  title?: string;
}

/**
 * Mensaje de error de formulario o de una peticion fallida.
 *
 * Usa el mensaje que devuelve la API, que ya viene en español y explica qué
 * hacer, en vez de un texto generico (docs/14-arquitectura.md §5.4).
 */
export function FormError({
  message,
  title = 'No se pudo completar la operación',
}: FormErrorProps) {
  if (!message) return null;
  return (
    <Alert severity="error" variant="outlined" icon={<CircleAlert size={20} />}>
      {title}: {message}
    </Alert>
  );
}
