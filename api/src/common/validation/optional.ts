import { ValidateIf } from 'class-validator';

/**
 * El campo puede omitirse, pero si viene se valida aunque sea `null`.
 *
 * `@IsOptional()` también salta la validación con `null`, y en una columna
 * NOT NULL eso termina en un 500 al guardar en lugar de un 400 al validar.
 * Es lo mismo que hace `PartialType(..., { skipNullProperties: false })`.
 */
export const IsOptionalNonNull = (): PropertyDecorator =>
  ValidateIf((_object: object, value: unknown) => value !== undefined);
