import { isISO8601, ValidateBy, type ValidationOptions } from 'class-validator';

/** Fecha, hora y desfase: `2026-10-22T07:00:00-06:00`, `…T13:00Z`, con o sin segundos. */
const DATE_TIME_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

/** True si el valor es un instante sin ambigüedad: fecha y hora válidas, con zona. */
export function isDateTimeWithOffset(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    DATE_TIME_WITH_OFFSET.test(value) &&
    isISO8601(value, { strict: true })
  );
}

/**
 * Fecha ISO-8601 con hora y zona horaria. Reemplaza a `@IsISO8601()`, que también
 * acepta `2026-10-22` y `2026-10-22T07:00:00`: sin zona, `new Date()` las lee en la del
 * servidor (UTC en el contenedor) y el viaje quedaría corrido seis horas respecto a
 * Managua. `field` es el nombre del campo en el mensaje: "El inicio", "from".
 */
export function IsDateTimeWithOffset(
  field: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isDateTimeWithOffset',
      validator: {
        validate: (value: unknown): boolean => isDateTimeWithOffset(value),
        defaultMessage: (): string =>
          `${field} debe ser una fecha con hora y zona horaria, como 2026-10-22T07:00:00-06:00`,
      },
    },
    options,
  );
}
