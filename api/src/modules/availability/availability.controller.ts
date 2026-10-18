import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '#common/decorators/roles.decorator.js';
import { TimeRangeQueryDto, toTimeRange } from '#common/dto/time-range-query.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import {
  AvailabilityService,
  type Agenda,
  type DriverAvailability,
  type ResourceAvailability,
} from './availability.service.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';

/**
 * Disponibilidad (RF-09). Cualquier usuario autenticado consulta la de medios:
 * el técnico la ve antes de enviar su solicitud. Solo recibe motivos, no datos
 * de quién ocupa el medio.
 */
@ApiTags('Disponibilidad')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(@Inject(AvailabilityService) private readonly service: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Medios libres y no libres (con motivo) en un periodo [from, to)' })
  resources(@Query() query: AvailabilityQueryDto): Promise<ResourceAvailability> {
    return this.service.resources(toTimeRange(query), query.type, query.passengers);
  }

  @Get('drivers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Conductores libres y con licencia vigente en un periodo' })
  drivers(@Query() query: TimeRangeQueryDto): Promise<DriverAvailability> {
    return this.service.drivers(toTimeRange(query));
  }
}

/** Agenda de todos los medios (RF-16). Exclusiva del ADMIN: muestra quién viaja y a dónde. */
@ApiTags('Disponibilidad')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('agenda')
export class AgendaController {
  constructor(@Inject(AvailabilityService) private readonly service: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Una fila por medio con sus viajes, bloqueos y solicitudes pendientes' })
  agenda(@Query() query: TimeRangeQueryDto): Promise<Agenda> {
    return this.service.agenda(toTimeRange(query));
  }
}
