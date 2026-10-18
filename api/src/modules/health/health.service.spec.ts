import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { API_VERSION, HealthService } from './health.service.js';

/** El health check informa la versión real del package.json, no la de npm. */
describe('HealthService', () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
  ) as {
    version: string;
  };

  it('lee la version del package.json de la API', () => {
    expect(API_VERSION).toBe(pkg.version);
  });

  it('informa ok y la version cuando la base responde', async () => {
    const dataSource = {
      isInitialized: true,
      query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const result = await new HealthService(dataSource as never).check();
    expect(result).toMatchObject({ status: 'ok', database: 'connected', version: pkg.version });
  });

  it('informa degraded cuando la base no responde', async () => {
    const dataSource = {
      isInitialized: true,
      query: vi.fn().mockRejectedValue(new Error('caida')),
    };
    const result = await new HealthService(dataSource as never).check();
    expect(result).toMatchObject({ status: 'degraded', database: 'disconnected' });
  });
});
