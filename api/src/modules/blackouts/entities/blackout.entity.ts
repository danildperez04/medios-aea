import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { BlackoutReason } from '#common/enums/domain.enums.js';
import { timeRangeTransformer, type TimeRange } from '#common/utils/time-range.js';
import { Resource } from '#modules/resources/entities/resource.entity.js';
import { User } from '#modules/users/entities/user.entity.js';

/** Periodo en que un recurso no se puede usar: taller, uso administrativo, etc. (RF-08). */
@Entity('blackout')
export class Blackout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Relation<Resource>;

  @Column({ type: 'tstzrange', transformer: timeRangeTransformer })
  period: TimeRange;

  @Column({ type: 'enum', enum: BlackoutReason, enumName: 'blackout_reason' })
  reason: BlackoutReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: Relation<User | null>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
