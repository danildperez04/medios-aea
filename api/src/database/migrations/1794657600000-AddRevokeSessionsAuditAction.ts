import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Acción de auditoría para el cierre de sesiones de una persona desde el panel (HU-29):
 * quién cerró las sesiones de quién y cuándo.
 */
export class AddRevokeSessionsAuditAction1794657600000 implements MigrationInterface {
  name = 'AddRevokeSessionsAuditAction1794657600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'REVOKE_SESSIONS'`);
  }

  /**
   * PostgreSQL no permite quitar un valor de un enum. Se deja: sin el código que lo
   * escribe no se usa, y recrear el tipo obligaría a decidir qué hacer con los registros
   * de auditoría que ya lo tengan, que no se deben borrar.
   */
  public async down(): Promise<void> {
    // Sin cambios: ver el comentario.
  }
}
