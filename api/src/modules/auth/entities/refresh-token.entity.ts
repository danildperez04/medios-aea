import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '#modules/users/entities/user.entity.js';

/** Cliente dueño de una sesión: el panel web o la app móvil. */
export type SessionClient = 'web' | 'mobile';

/**
 * Refresh token de una sesión del panel web o de la app móvil (ADR 0003). Solo se guarda su SHA-256.
 * Las rotaciones de una sesión comparten `familyId`; un token usado de nuevo fuera
 * del margen de gracia revoca la familia entera (alguien lo copió).
 */
@Entity('refresh_token')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'family_id', type: 'uuid' })
  familyId: string;

  /** Un token solo sirve en las rutas de su cliente. */
  @Column({ type: 'varchar', length: 10, default: 'web' })
  client: SessionClient;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** Cuándo se rotó: desde ahí ya no vale, salvo el margen de gracia. */
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
