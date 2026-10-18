import { Alert } from '@mui/material';
import { CircleAlert } from 'lucide-react';

export interface FormErrorProps {
  /** Mensaje a mostrar. Si es null o vacio, no se renderiza nada. */
  message: string | null | undefined;
  /** Contexto opcional antes del mensaje, p. ej. "No se guardó el proyecto". */
  title?: string;
}

/**
 * Mensaje de error de formulario o de una peticion fallida.
 *
 * Usa el mensaje que devuelve la API, que ya viene en español y explica qué
 * hacer, en vez de un texto generico (docs/14-arquitectura.md §5.4).
 */
export function FormError({ message, title }: FormErrorProps) {
  if (!message) return null;
  // Sin prefijo genérico: el mensaje de la API ya dice qué pasó y cómo resolverlo.
  return (
    <Alert severity="error" variant="outlined" icon={<CircleAlert size={20} />} role="alert">
      {title ? <strong>{title}. </strong> : null}
      {message}
    </Alert>
  );
}
