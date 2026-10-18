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
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehicleFiltersDto } from './dto/vehicle-filters.dto.js';
import type { VehicleView } from './vehicle.view.js';
import { VehiclesService } from './vehicles.service.js';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Vehículos de la flota. Gestión exclusiva del ADMIN (RF-06). */
@ApiTags('Vehículos')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('vehicles')
export class VehiclesController {
  constructor(@Inject(VehiclesService) private readonly service: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar vehículos (sin filtro de estado, excluye los dados de baja)' })
  findAll(@Query() filters: VehicleFiltersDto): Promise<PaginatedResponse<VehicleView>> {
    return this.service.findAll(filters);
  }

  @Get(':id')
  @ApiResponse({ status: 404, description: 'El vehículo no existe' })
  findOne(@Param('id', uuid) id: string): Promise<VehicleView> {
    return this.service.findOneOrFail(id);
  }

  @Post()
  @ApiResponse({ status: 409, description: 'La placa ya está registrada' })
  create(@Body() dto: CreateVehicleDto): Promise<VehicleView> {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', uuid) id: string, @Body() dto: UpdateVehicleDto): Promise<VehicleView> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dar de baja un vehículo (no se borra)' })
  async deactivate(@Param('id', uuid) id: string): Promise<{ message: string }> {
    await this.service.deactivate(id);
    return { message: 'Vehículo dado de baja.' };
  }
}
