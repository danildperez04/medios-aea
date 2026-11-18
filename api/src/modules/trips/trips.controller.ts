import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { Roles } from '#common/decorators/roles.decorator.js';
import { UserRole } from '#common/enums/domain.enums.js';
import type { TripView } from './trip.view.js';
import { TripsService } from './trips.service.js';

/**
 * Viajes de quien conduce (RF-21, HU-20). Abierto a los tres roles: conduce quien esté
 * asignado, sea técnico, coordinación o chofer de planta (RN-16, ADR 0004).
 */
@ApiTags('Viajes')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.REQUESTER, UserRole.DRIVER)
@Controller('trips')
export class TripsController {
  constructor(@Inject(TripsService) private readonly trips: TripsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Mis viajes de hoy y próximos, como conductor asignado' })
  mine(@CurrentUser() user: AuthenticatedUser): Promise<TripView[]> {
    return this.trips.mine(user.id);
  }

  @Get('mine/:reservationId')
  @ApiOperation({ summary: 'Un viaje que conduzco, por el id de su solicitud' })
  @ApiResponse({ status: 404, description: 'No lo conduce esta persona' })
  mineByReservation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', new ParseUUIDPipe({ version: '4' })) reservationId: string,
  ): Promise<TripView> {
    return this.trips.mineByReservation(user.id, reservationId);
  }
}
