import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, type Relation } from 'typeorm';
import { FuelType } from '#common/enums/domain.enums.js';
import { Resource } from './resource.entity.js';

/** Detalle 1:1 de un `resource` de tipo VEHICLE. */
@Entity('vehicle')
export class Vehicle {
  @PrimaryColumn({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @OneToOne(() => Resource, (resource) => resource.vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Relation<Resource>;

  @Column({ type: 'varchar', length: 20, unique: true })
  plate: string;

  @Column({ type: 'varchar', length: 60 })
  brand: string;

  @Column({ type: 'varchar', length: 60 })
  model: string;

  @Column({ type: 'smallint', nullable: true })
  year: number | null;

  @Column({ name: 'passenger_capacity', type: 'smallint' })
  passengerCapacity: number;

  @Column({ name: 'fuel_type', type: 'enum', enum: FuelType, enumName: 'fuel_type' })
  fuelType: FuelType;

  @Column({ name: 'current_odometer', type: 'integer', default: 0 })
  currentOdometer: number;
}
