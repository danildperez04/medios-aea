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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '#common/decorators/current-user.decorator.js';
import { Roles } from '#common/decorators/roles.decorator.js';
import type { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { NotificationFiltersDto } from './dto/notification-filters.dto.js';
import { RegisterDeviceDto, RemoveDeviceDto } from './dto/register-device.dto.js';
import { NotificationInboxService, type NotificationView } from './notification-inbox.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Bandeja de avisos y teléfonos para el push (RF-19, RF-20, HU-19). Cada quien, lo suyo. */
@ApiTags('Notificaciones')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.REQUESTER, UserRole.DRIVER)
@Controller('notifications')
export class NotificationsController {
  constructor(@Inject(NotificationInboxService) private readonly inbox: NotificationInboxService) {}

  @Get()
  @ApiOperation({ summary: 'Mis avisos, del más reciente al más antiguo' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: NotificationFiltersDto,
  ): Promise<PaginatedResponse<NotificationView>> {
    return this.inbox.list(user.id, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Cuántos avisos no he leído' })
  unreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    return this.inbox.unreadCount(user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todos mis avisos como leídos' })
  markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<{ updated: number }> {
    return this.inbox.markAllRead(user.id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar un aviso como leído' })
  @ApiResponse({ status: 404, description: 'No existe o no es tuyo' })
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', uuid) id: string,
  ): Promise<NotificationView> {
    return this.inbox.markRead(user.id, id);
  }

  @Put('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registrar este teléfono para recibir avisos push' })
  async registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ): Promise<void> {
    await this.inbox.registerDevice(user.id, dto.token, dto.platform);
  }

  @Post('devices/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Dejar de recibir avisos push en este teléfono' })
  async removeDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RemoveDeviceDto,
  ): Promise<void> {
    await this.inbox.removeDevice(user.id, dto.token);
  }
}
