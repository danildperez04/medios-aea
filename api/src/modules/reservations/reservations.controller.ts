import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '#common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { Roles } from '#common/decorators/roles.decorator.js';
import type { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ReservationFiltersDto } from './dto/reservation-filters.dto.js';
import type { ReservationView } from './reservation.view.js';
import { ReservationsService } from './reservations.service.js';

/**
 * Solicitudes de medios. Las crean técnicos (y la coordinación en nombre de
 * alguien, RN-14). Los conductores no las gestionan: ven sus viajes (HU-20).
 */
@ApiTags('Solicitudes')
@ApiBearerAuth()
@Roles(UserRole.REQUESTER, UserRole.ADMIN)
@Controller('reservations')
export class ReservationsController {
  constructor(@Inject(ReservationsService) private readonly service: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una solicitud; queda pendiente y avisa a la coordinación' })
  @ApiResponse({ status: 400, description: 'Horario, proyecto o medio preferido no válidos' })
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    return this.service.create(dto, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes (un técnico solo ve las suyas)' })
  findAll(
    @Query() filters: ReservationFiltersDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaginatedResponse<ReservationView>> {
    return this.service.findAll(filters, actor);
  }

  @Get(':id')
  @ApiResponse({ status: 404, description: 'No existe o no es tuya' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    return this.service.findOneOrFail(id, actor);
  }
}
