import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { PaginatedResponse } from '#common/dto/pagination.dto.js';
import { ResourceStatus, ResourceType } from '#common/enums/domain.enums.js';
import type { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import type { VehicleFiltersDto } from './dto/vehicle-filters.dto.js';
import { Resource } from './entities/resource.entity.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { toVehicleView, type VehicleView } from './vehicle.view.js';

/**
 * Vehículos (RF-06, HU-05). Cada vehículo es un `resource` de tipo VEHICLE más su
 * detalle 1:1 en `vehicle`; se crean y actualizan juntos en una transacción.
 * Un vehículo nunca se borra (tiene historial de viajes): pasa a INACTIVE.
 */
@Injectable()
export class VehiclesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(getRepositoryToken(Vehicle)) private readonly vehicles: Repository<Vehicle>,
  ) {}

  async findAll(filters: VehicleFiltersDto): Promise<PaginatedResponse<VehicleView>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const query = this.vehicles
      .createQueryBuilder('vehicle')
      .innerJoinAndSelect('vehicle.resource', 'resource');

    if (filters.status) {
      query.andWhere('resource.status = :status', { status: filters.status });
    } else {
      query.andWhere('resource.status <> :inactive', { inactive: ResourceStatus.INACTIVE });
    }
    if (filters.search) {
      query.andWhere(
        `(resource.name ILIKE :search OR vehicle.plate ILIKE :search
          OR vehicle.brand ILIKE :search OR vehicle.model ILIKE :search)`,
        { search: `%${filters.search}%` },
      );
    }

    const [rows, total] = await query
      .orderBy('resource.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return new PaginatedResponse(
      rows.map((vehicle) => toVehicleView(vehicle.resource, vehicle)),
      total,
      page,
      limit,
    );
  }

  async findOneOrFail(id: string): Promise<VehicleView> {
    const vehicle = await this.vehicles.findOne({
      where: { resourceId: id },
      relations: { resource: true },
    });
    if (!vehicle) throw new NotFoundException('El vehículo no existe.');
    return toVehicleView(vehicle.resource, vehicle);
  }

  async create(dto: CreateVehicleDto): Promise<VehicleView> {
    await this.assertPlateFree(dto.plate);
    const id = await this.dataSource.transaction(async (manager) => {
      const resource = await manager.save(
        manager.create(Resource, {
          type: ResourceType.VEHICLE,
          name: dto.name,
          status: ResourceStatus.AVAILABLE,
          notes: dto.notes || null,
        }),
      );
      await manager.save(
        manager.create(Vehicle, {
          resourceId: resource.id,
          plate: dto.plate,
          brand: dto.brand,
          model: dto.model,
          year: dto.year ?? null,
          passengerCapacity: dto.passengerCapacity,
          fuelType: dto.fuelType,
          currentOdometer: dto.currentOdometer ?? 0,
        }),
      );
      return resource.id;
    });
    return this.findOneOrFail(id);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleView> {
    const current = await this.findOneOrFail(id);
    if (dto.plate && dto.plate !== current.plate) await this.assertPlateFree(dto.plate, id);
    // El odómetro solo avanza: bajarlo falsearía los kilómetros de los reportes (RN-11).
    if (dto.currentOdometer !== undefined && dto.currentOdometer < current.currentOdometer) {
      throw new BadRequestException(
        `El kilometraje no puede bajar: el vehículo ya registra ${current.currentOdometer} km.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const resourcePatch: Partial<Resource> = {};
      if (dto.name !== undefined) resourcePatch.name = dto.name;
      if (dto.status !== undefined) resourcePatch.status = dto.status;
      if (dto.notes !== undefined) resourcePatch.notes = dto.notes || null;
      if (Object.keys(resourcePatch).length) await manager.update(Resource, id, resourcePatch);

      const vehiclePatch: Partial<Vehicle> = {};
      for (const key of [
        'plate',
        'brand',
        'model',
        'passengerCapacity',
        'fuelType',
        'currentOdometer',
      ] as const) {
        if (dto[key] !== undefined) Object.assign(vehiclePatch, { [key]: dto[key] });
      }
      if (dto.year !== undefined) vehiclePatch.year = dto.year;
      if (Object.keys(vehiclePatch).length)
        await manager.update(Vehicle, { resourceId: id }, vehiclePatch);
    });
    return this.findOneOrFail(id);
  }

  /** Baja lógica: deja de aparecer en la agenda y en la disponibilidad. */
  async deactivate(id: string): Promise<void> {
    await this.update(id, { status: ResourceStatus.INACTIVE });
  }

  private async assertPlateFree(plate: string, exceptId?: string): Promise<void> {
    const taken = await this.vehicles.existsBy(
      exceptId ? { plate, resourceId: Not(exceptId) } : { plate },
    );
    if (taken) throw new ConflictException(`Ya existe un vehículo con la placa ${plate}.`);
  }
}
