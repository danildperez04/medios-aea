import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';

/**
 * Medios. Hoy solo vehículos; en la fase 2 se agrega un EquipmentController con
 * su propio detalle, sobre el mismo `resource`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Resource, Vehicle])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class ResourcesModule {}
