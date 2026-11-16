import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refresh tokens de la sesión del panel web (ADR 0003). Se guarda solo el SHA-256
 * del valor, nunca el valor. `family_id` agrupa las rotaciones de una misma sesión:
 * si vuelve un token ya usado, se revoca la familia completa.
 */
export class AddRefreshToken1792929600000 implements MigrationInterface {
  name = 'AddRefreshToken1792929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_token (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     uuid NOT NULL
                    CONSTRAINT fk_refresh_token_user REFERENCES "user"(id) ON DELETE CASCADE,
        family_id   uuid NOT NULL,
        token_hash  char(64) NOT NULL CONSTRAINT uq_refresh_token_hash UNIQUE,
        expires_at  timestamptz NOT NULL,
        used_at     timestamptz,
        revoked_at  timestamptz,
        created_at  timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`CREATE INDEX ix_refresh_token_family ON refresh_token (family_id)`);
    await queryRunner.query(`CREATE INDEX ix_refresh_token_user ON refresh_token (user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE refresh_token`);
  }
}
