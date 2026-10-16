import { Inject, Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

export type HealthStatus = 'ok' | 'degraded';

export class HealthCheckResult {
  @ApiProperty({ example: 'ok' })
  status: HealthStatus;

  @ApiProperty({ example: 'connected' })
  database: string;

  @ApiProperty({ example: 42.3 })
  uptime: number;

  @ApiProperty({ example: '2026-10-16T18:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '0.1.0' })
  version: string;
}

/**
 * Verifica que la API responde y que la base de datos está conectada.
 *
 * Lo consume el health check de Docker para decidir el reinicio del contenedor
 * (RNF-06), así que la comprobación de la base no puede omitirse.
 */
@Injectable()
export class HealthService {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckResult> {
    let database = 'connected';
    let status: HealthStatus = 'ok';

    try {
      if (!this.dataSource.isInitialized) await this.dataSource.initialize();
      await this.dataSource.query('SELECT 1');
    } catch {
      database = 'disconnected';
      status = 'degraded';
    }

    return {
      status,
      database,
      uptime: Math.round(process.uptime() * 10) / 10,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
