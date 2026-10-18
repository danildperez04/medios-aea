import {
  Body,
  Controller,
  Delete,
  Get,
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
import { UserRole } from '#common/enums/domain.enums.js';
import { BlackoutsService, type BlackoutView } from './blackouts.service.js';
import { BlackoutFiltersDto } from './dto/blackout-filters.dto.js';
import { CreateBlackoutDto } from './dto/create-blackout.dto.js';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Bloqueos de cualquier medio (RF-08). Gestión exclusiva del ADMIN. */
@ApiTags('Bloqueos')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller()
export class BlackoutsController {
  constructor(@Inject(BlackoutsService) private readonly service: BlackoutsService) {}

  @Get('resources/:resourceId/blackouts')
  @ApiOperation({ summary: 'Bloqueos de un medio; sin rango, los que aún no terminan' })
  findForResource(
    @Param('resourceId', uuid) resourceId: string,
    @Query() filters: BlackoutFiltersDto,
  ): Promise<BlackoutView[]> {
    return this.service.findForResource(resourceId, filters);
  }

  @Post('resources/:resourceId/blackouts')
  @ApiResponse({
    status: 409,
    description: 'Choca con un viaje aprobado u otro bloqueo (ver details)',
  })
  create(
    @Param('resourceId', uuid) resourceId: string,
    @Body() dto: CreateBlackoutDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<BlackoutView> {
    return this.service.create(resourceId, dto, actor.id);
  }

  @Delete('blackouts/:id')
  async remove(@Param('id', uuid) id: string): Promise<{ message: string }> {
    await this.service.remove(id);
    return { message: 'Bloqueo eliminado.' };
  }
}
