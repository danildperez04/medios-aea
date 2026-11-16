import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Indica a Express cuántos proxies de confianza hay delante de la API
 * (`TRUST_PROXY_HOPS`), para que `req.ip` sea la dirección de quien hace la petición y
 * no la del proxy. El límite de peticiones (RNF-01) cuenta por `req.ip`.
 *
 * El valor debe ser exacto. Con menos saltos de los reales, `req.ip` es la de un proxy
 * y todas las personas comparten el mismo límite; con más, se toma una dirección de
 * `X-Forwarded-For` que el cliente puede escribir a su gusto.
 *
 * - 0: sin proxy (desarrollo y pruebas). El encabezado `X-Forwarded-For` se ignora.
 * - 1: solo nginx del panel delante (Docker Compose sin dominio).
 * - 2: un proxy de HTTPS delante de nginx (Caddy, o el borde de un PaaS).
 */
export function applyTrustProxy(app: NestExpressApplication, config: ConfigService): void {
  const hops = config.get<number>('TRUST_PROXY_HOPS', 0);
  app.set('trust proxy', hops > 0 ? hops : false);
}
