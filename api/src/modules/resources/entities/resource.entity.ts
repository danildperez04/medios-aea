import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { ResourceStatus, ResourceType } from '#common/enums/domain.enums.js';
import { Vehicle } from './vehicle.entity.js';

/**
 * Medio que se presta para una actividad. Es la abstracción sobre la que
 * trabaja la regla anti-choque: las asignaciones apuntan a un `resource`, no a
 * un vehículo, para que en la fase 2 los proyectores o laptops usen la misma
 * restricción de exclusión (docs/10-esquema-base-de-datos.md §6).
 */
@Entity('resource')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ResourceType, enumName: 'resource_type' })
  type: ResourceType;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({
    type: 'enum',
    enum: ResourceStatus,
    enumName: 'resource_status',
    default: ResourceStatus.AVAILABLE,
  })
  status: ResourceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToOne(() => Vehicle, (vehicle) => vehicle.resource)
  vehicle?: Relation<Vehicle>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
