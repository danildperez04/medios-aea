import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { APP_FILTER } from '@nestjs/core';

/** Cuerpo de error uniforme que devuelve la API. Nunca incluye trazas. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  details?: unknown;
}

/**
 * Manejo global de excepciones.
 *
 * El cliente recibe un mensaje en español y accionable, nunca un detalle interno.
 * Las trazas de pila solo se registran en el log del servidor, y solo fuera de
 * producción.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<{ url: string; method: string }>();

    const { status, message, error, details } = this.resolve(exception);

    const body: ApiErrorBody = {
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    if (details !== undefined) body.details = details;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`);
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    message: string;
    error: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return { status, message: payload, error: exception.name };
      }
      const record = payload as Record<string, unknown>;
      const rawMessage = record.message;
      return {
        status,
        message: Array.isArray(rawMessage)
          ? (rawMessage as string[]).join('; ')
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message,
        error: typeof record.error === 'string' ? record.error : exception.name,
        // Detalles explícitos (p. ej. con qué choca un bloqueo) o la lista de errores de validación.
        details: record.details ?? (Array.isArray(rawMessage) ? rawMessage : undefined),
      };
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string; constraint?: string };
      // 23505 = unique_violation, 23503 = foreign_key_violation, 23514 = check_violation,
      // 23P01 = exclusion_violation (dos asignaciones activas solapadas, RN-01/RN-02).
      // El servicio de reservas valida antes y da un mensaje más preciso; esta es la
      // red de seguridad para el caso de dos aprobaciones simultáneas.
      if (driverError.code === '23P01') {
        const isDriver = driverError.constraint?.includes('driver') ?? false;
        return {
          status: HttpStatus.CONFLICT,
          message: isDriver
            ? 'El conductor ya tiene otro viaje asignado en ese horario.'
            : 'El vehículo ya está asignado a otra actividad en ese horario.',
          error: 'Conflict',
        };
      }
      // 40P01 = deadlock_detected. Las aprobaciones bloquean medio y conductor en el
      // mismo orden para evitarlo; si aun así ocurre, se perdió una carrera: 409.
      if (driverError.code === '40P01') {
        return {
          status: HttpStatus.CONFLICT,
          message:
            'Otra persona estaba asignando el mismo medio o conductor a la vez. Recarga e inténtalo de nuevo.',
          error: 'Conflict',
        };
      }
      if (driverError.code === '23505') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'Ya existe un registro con esos datos únicos.',
          error: 'Conflict',
        };
      }
      if (driverError.code === '23503') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'La operación referencia un registro que no existe o que está en uso.',
          error: 'Conflict',
        };
      }
      if (driverError.code === '23514') {
        return {
          status: HttpStatus.BAD_REQUEST,
          message:
            'La operación viola una restricción de integridad. Revisa las fechas y las cantidades.',
          error: 'Bad Request',
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocurrió un error interno. Intenta de nuevo en unos momentos.',
      error: 'Internal Server Error',
    };
  }
}

export const ALL_EXCEPTIONS_FILTER = APP_FILTER;
