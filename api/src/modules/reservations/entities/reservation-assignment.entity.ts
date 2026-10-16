import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { timeRangeTransformer, type TimeRange } from '#common/utils/time-range.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { TripLog } from '#modules/trips/entities/trip-log.entity.js';
import { ReservationRequest } from './reservation-request.entity.js';

/**
 * Ocupación real de un recurso (y opcionalmente de un conductor).
 *
 * Las restricciones de exclusión `ex_assignment_resource_overlap` y
 * `ex_assignment_driver_overlap` impiden dos filas activas solapadas (RN-01,
 * RN-02). Cancelar o reasignar pone `active = false`; nunca se borra.
 */
@Entity('reservation_assignment')
export class ReservationAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => ReservationRequest, (request) => request.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: Relation<ReservationRequest>;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @ManyToOne(() => Resource, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'resource_id' })
  resource: Relation<Resource>;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId: string | null;

  @ManyToOne(() => Driver, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver: Relation<Driver | null>;

  @Column({ type: 'tstzrange', transformer: timeRangeTransformer })
  period: TimeRange;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToOne(() => TripLog, (trip) => trip.assignment)
  trip?: Relation<TripLog | null>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
