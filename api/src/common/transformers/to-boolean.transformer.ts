import { Transform } from 'class-transformer';

/**
 * Convierte 'true' / 'false' de la query string a booleano.
 *
 * Los query params siempre llegan como texto: sin esto, `?isActive=false`
 * se interpretaría como `true`, porque la cadena 'false' es truthy.
 * Un valor ausente o no booleano se convierte en `undefined` para no
 * aplicar el filtro por error.
 */
export const ToBoolean = (): PropertyDecorator =>
  Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  });

/** Mensaje de error estándar para un booleano recibido como texto. */
export const BOOLEAN_QUERY_MESSAGE = 'El valor debe ser true o false';
