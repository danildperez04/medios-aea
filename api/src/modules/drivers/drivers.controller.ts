import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '#common/decorators/roles.decorator.js';
import type { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { UserRole } from '#common/enums/domain.enums.js';
import { CreateDriverDto } from './dto/create-driver.dto.js';
import { DriverFiltersDto } from './dto/driver-filters.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import type { DriverView } from './driver.view.js';
import { DriversService } from './drivers.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Conductores y sus licencias. Gestión exclusiva del ADMIN (RF-07). */
@ApiTags('Conductores')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('drivers')
export class DriversController {
  constructor(@Inject(DriversService) private readonly service: DriversService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conductores; con expiringWithinDays, las licencias por vencer' })
  findAll(@Query() filters: DriverFiltersDto): Promise<PaginatedResponse<DriverView>> {
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', uuid) id: string): Promise<DriverView> {
    return this.service.findOneOrFail(id);
  }

  @Post()
  @ApiResponse({ status: 400, description: 'El usuario no tiene rol DRIVER o está desactivado' })
  @ApiResponse({ status: 409, description: 'El usuario ya es conductor o la licencia ya existe' })
  create(@Body() dto: CreateDriverDto): Promise<DriverView> {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', uuid) id: string, @Body() dto: UpdateDriverDto): Promise<DriverView> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un conductor (no se borra)' })
  async deactivate(@Param('id', uuid) id: string): Promise<{ message: string }> {
    await this.service.deactivate(id);
    return { message: 'Conductor desactivado.' };
  }
}
