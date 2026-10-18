/** Respuesta paginada uniforme de la API (api/src/common/dto/pagination.dto.ts). */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Parámetros de paginación que aceptan todos los listados. */
export interface PageParams {
  page: number;
  limit: number;
}
