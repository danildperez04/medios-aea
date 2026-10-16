import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Request, Response } from 'express';

/**
 * Registra cada petición HTTP: método, ruta, código y duración.
 * Los tiempos altos son la primera señal de un reporte mal indexado.
 */
@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const { method, url } = request;
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const line = `${method} ${url} ${response.statusCode} ${durationMs.toFixed(1)}ms`;
      if (response.statusCode >= 500) {
        console.error(line);
      } else if (durationMs > 500) {
        console.warn(line);
      } else {
        // eslint-disable-next-line no-console -- este interceptor ES el logger
        console.log(line);
      }
    });

    return next.handle();
  }
}
