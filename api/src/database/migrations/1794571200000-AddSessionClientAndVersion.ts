import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sesión de la app móvil y cierre de sesiones (ADR 0003, ampliación del 30/10/2026).
 *
 * - `refresh_token.client`: de qué cliente es la sesión. El panel y la app comparten la
 *   tabla, pero no las reglas (duración, rol) ni las rutas: un token solo sirve en la
 *   ruta de su cliente. Los tokens que ya existían son todos del panel.
 * - `"user".session_version`: va dentro de cada token de acceso. Al subirla, los tokens
 *   emitidos antes dejan de valer en la siguiente petición.
 */
export class AddSessionClientAndVersion1794571200000 implements MigrationInterface {
  name = 'AddSessionClientAndVersion1794571200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_token
        ADD COLUMN client varchar(10) NOT NULL DEFAULT 'web'
        CONSTRAINT ck_refresh_token_client CHECK (client IN ('web', 'mobile'))`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN session_version integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN session_version`);
    await queryRunner.query(`ALTER TABLE refresh_token DROP COLUMN client`);
  }
}
