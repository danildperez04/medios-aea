import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { ReservationAssignment } from '#modules/reservations/entities/reservation-assignment.entity.js';

/** Bitácora del conductor: salida y llegada de un viaje (RF-22, RF-23). */
@Entity('trip_log')
export class TripLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id', type: 'uuid', unique: true })
  assignmentId: string;

  @OneToOne(() => ReservationAssignment, (assignment) => assignment.trip, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Relation<ReservationAssignment>;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'start_odometer', type: 'integer' })
  startOdometer: number;

  /** Nivel de combustible en porcentaje (0–100). */
  @Column({ name: 'start_fuel_level', type: 'smallint' })
  startFuelLevel: number;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ name: 'end_odometer', type: 'integer', nullable: true })
  endOdometer: number | null;

  @Column({ name: 'end_fuel_level', type: 'smallint', nullable: true })
  endFuelLevel: number | null;

  /** numeric llega como string desde node-postgres para no perder precisión. */
  @Column({ name: 'fuel_added_liters', type: 'numeric', precision: 6, scale: 2, nullable: true })
  fuelAddedLiters: string | null;

  @Column({ type: 'text', nullable: true })
  observations: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
