import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { RequestStatus, ResourceType } from '#common/enums/domain.enums.js';
import { Driver } from '#modules/drivers/entities/driver.entity.js';
import { Project } from '#modules/projects/entities/project.entity.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { User } from '#modules/users/entities/user.entity.js';
import { ReservationAssignment } from './reservation-assignment.entity.js';

/**
 * Solicitud de un técnico para usar un vehículo en un horario, con quién conduce.
 * Una solicitud PENDING no ocupa la agenda (RN-07): solo su asignación aprobada lo hace.
 */
@Entity('reservation_request')
export class ReservationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Código legible, p. ej. SOL-2026-00042. */
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ name: 'requester_id', type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requester_id' })
  requester: Relation<User>;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'project_id' })
  project: Relation<Project>;

  @Column({
    name: 'resource_type',
    type: 'enum',
    enum: ResourceType,
    enumName: 'resource_type',
    default: ResourceType.VEHICLE,
  })
  resourceType: ResourceType;

  @Column({ name: 'preferred_resource_id', type: 'uuid', nullable: true })
  preferredResourceId: string | null;

  @ManyToOne(() => Resource, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'preferred_resource_id' })
  preferredResource: Relation<Resource | null>;

  /** Quién propone quien solicita que conduzca (RN-15). La asignación guarda al real. */
  @Column({ name: 'proposed_driver_id', type: 'uuid', nullable: true })
  proposedDriverId: string | null;

  @ManyToOne(() => Driver, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'proposed_driver_id' })
  proposedDriver: Relation<Driver | null>;

  @Column({ type: 'varchar', length: 300 })
  purpose: string;

  @Column({ type: 'varchar', length: 200 })
  destination: string;

  @Column({ type: 'smallint' })
  passengers: number;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    enumName: 'request_status',
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 300, nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'decided_by' })
  decidedBy: Relation<User | null>;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @OneToMany(() => ReservationAssignment, (assignment) => assignment.request)
  assignments?: Relation<ReservationAssignment[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
