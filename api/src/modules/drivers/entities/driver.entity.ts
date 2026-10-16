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
import { User } from '#modules/users/entities/user.entity.js';

/**
 * Conductor: un usuario con rol DRIVER y licencia. Un conductor con la licencia
 * vencida a la fecha del viaje no se puede asignar (RN-09).
 */
@Entity('driver')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'license_number', type: 'varchar', length: 40, unique: true })
  licenseNumber: string;

  /** Fecha calendario (sin hora): la licencia vale hasta el final de ese día. */
  @Column({ name: 'license_expiry', type: 'date' })
  licenseExpiry: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
