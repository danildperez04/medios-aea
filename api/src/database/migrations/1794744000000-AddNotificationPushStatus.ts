import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Envío push de las notificaciones (HU-19). La tabla `notification` hace de cola: cada
 * aviso nace `PENDING` dentro de la transacción que lo origina, y un despachador lo
 * envía después a Expo. Así un aviso nunca sale de una operación que se deshizo, y si
 * la API se reinicia, los pendientes se envían al volver.
 *
 * Los avisos que ya existían no se envían: se marcan `SKIPPED`.
 */
export class AddNotificationPushStatus1794744000000 implements MigrationInterface {
  name = 'AddNotificationPushStatus1794744000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notification
        ADD COLUMN push_status varchar(10) NOT NULL DEFAULT 'SKIPPED'
          CONSTRAINT ck_notification_push_status
          CHECK (push_status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')),
        ADD COLUMN push_attempts smallint NOT NULL DEFAULT 0`);
    // Los nuevos nacen pendientes; los anteriores quedaron SKIPPED con el default de arriba.
    await queryRunner.query(
      `ALTER TABLE notification ALTER COLUMN push_status SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_notification_push_pending ON notification (created_at)
         WHERE push_status = 'PENDING'`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_notification_user_unread ON notification (user_id) WHERE read_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX ix_notification_user_unread`);
    await queryRunner.query(`DROP INDEX ix_notification_push_pending`);
    await queryRunner.query(
      `ALTER TABLE notification DROP COLUMN push_attempts, DROP COLUMN push_status`,
    );
  }
}
