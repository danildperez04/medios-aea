import type { FuelType, ResourceStatus, ResourceType } from '#common/enums/domain.enums.js';
import type { Resource } from './entities/resource.entity.js';
import type { Vehicle } from './entities/vehicle.entity.js';

/**
 * Lo que la API devuelve de un vehículo: el `resource` genérico y su detalle
 * `vehicle` en un solo objeto. `id` es el del resource, que es el que usan la
 * agenda, las asignaciones y los bloqueos.
 */
export interface VehicleView {
  id: string;
  type: ResourceType;
  name: string;
  status: ResourceStatus;
  notes: string | null;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  passengerCapacity: number;
  fuelType: FuelType;
  currentOdometer: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toVehicleView(resource: Resource, vehicle: Vehicle): VehicleView {
  return {
    id: resource.id,
    type: resource.type,
    name: resource.name,
    status: resource.status,
    notes: resource.notes,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    passengerCapacity: vehicle.passengerCapacity,
    fuelType: vehicle.fuelType,
    currentOdometer: vehicle.currentOdometer,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}
