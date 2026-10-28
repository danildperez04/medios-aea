import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '#common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { Roles } from '#common/decorators/roles.decorator.js';
import type { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { ApproveReservationDto } from './dto/approve-reservation.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { RejectReservationDto } from './dto/reject-reservation.dto.js';
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

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Aprobar asignando medio y conductor (por defecto, el propuesto) sin choques',
  })
  @ApiResponse({ status: 409, description: 'Ya no está pendiente o el medio o conductor chocan' })
  @ApiResponse({
    status: 422,
    description: 'Medio en mantenimiento, sin capacidad o licencia vencida',
  })
  approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ApproveReservationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    return this.service.approve(id, dto, actor);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Rechazar una solicitud pendiente con motivo; avisa a quien pidió' })
  @ApiResponse({ status: 400, description: 'Falta el motivo o es muy corto (PT-22)' })
  @ApiResponse({ status: 409, description: 'La solicitud ya no está pendiente' })
  reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RejectReservationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    return this.service.reject(id, dto, actor);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancelar una solicitud pendiente o aprobada; libera el medio y el conductor',
  })
  @ApiResponse({ status: 404, description: 'No existe o no es tuya' })
  @ApiResponse({ status: 409, description: 'Ya está cerrada o el viaje ya inició' })
  cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReservationView> {
    return this.service.cancel(id, actor);
  }
}
