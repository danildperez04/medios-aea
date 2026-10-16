import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '#common/decorators/public.decorator.js';
import { HealthService, type HealthCheckResult } from './health.service.js';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado del servicio y de la base de datos (RNF-06)' })
  @ApiResponse({ status: 200, description: 'Servicio operativo' })
  @ApiResponse({ status: 503, description: 'Servicio degradado: la base no responde' })
  async check(): Promise<HealthCheckResult> {
    const result = await this.healthService.check();
    // 503 hace que el health check de Docker marque el contenedor como unhealthy
    // y Nginx deje de enviarle tráfico.
    if (result.status === 'degraded') throw new ServiceUnavailableException(result);
    return result;
  }
}
