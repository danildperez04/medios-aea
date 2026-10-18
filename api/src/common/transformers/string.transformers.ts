import { Transform } from 'class-transformer';

/**
 * Normalizadores de texto para los DTO. Se aplican antes de validar, así que
 * `"  "` llega como `""` y falla `MinLength` en vez de guardarse como espacios.
 */

/** Quita espacios al inicio y al final. Deja pasar lo que no es texto. */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Quita espacios y pasa a mayúsculas: códigos como `PRY-AGUA`. */
export const TrimUpperCase = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );
