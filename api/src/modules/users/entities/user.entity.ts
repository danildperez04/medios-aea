import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '#common/enums/domain.enums.js';

/**
 * Usuario del sistema: coordinación (ADMIN), técnico (REQUESTER) o conductor (DRIVER).
 * `passwordHash` tiene `select: false`: nunca aparece en una consulta normal.
 * Ref: RF-01, RF-02, RF-03, RNF-01 — docs/10-esquema-base-de-datos.md §3
 */
@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string;

  /** Único sin distinguir mayúsculas (índice sobre lower(email) en la migración). */
  @Column({ type: 'varchar', length: 160 })
  email: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role' })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Va dentro de cada token de acceso. Se sube al cambiar la contraseña o al cerrar las
   * sesiones de la persona: los tokens emitidos antes dejan de valer (ADR 0003).
   */
  @Column({ name: 'session_version', type: 'integer', default: 0 })
  sessionVersion: number;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
