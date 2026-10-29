import type { AxiosError } from 'axios';

/** Cuerpo de error que devuelve la API. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  path?: string;
  timestamp?: string;
  details?: unknown;
}

/** Error normalizado que consumen los hooks y los formularios. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function extractMessage(error: AxiosError<ApiErrorBody>, fallback: string): string {
  const body = error.response?.data;
  if (body?.message) return body.message;
  if (error.code === 'ERR_NETWORK') {
    return 'No hay conexión con el servidor. Revisa tu red e intenta de nuevo.';
  }
  if (error.code === 'ECONNABORTED') {
    return 'La solicitud tardó demasiado. Intenta de nuevo.';
  }
  return fallback;
}

/** Convierte un error de Axios en `ApiError`, con el mensaje que manda la API. */
export function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  return new ApiError(
    error.response?.status ?? 0,
    extractMessage(error, 'Ocurrió un error inesperado. Intenta de nuevo.'),
    error.response?.data?.details,
  );
}
