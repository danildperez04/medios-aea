import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conductor propuesto por quien solicita (ADR 0004, HU-26). Nulo en la base:
 * las solicitudes anteriores no lo tienen y los medios de fase 2 (un proyector)
 * no llevan conductor. El servicio lo exige para vehículos.
 */
export class AddProposedDriver1792411200000 implements MigrationInterface {
  name = 'AddProposedDriver1792411200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reservation_request
        ADD COLUMN proposed_driver_id uuid
          CONSTRAINT fk_request_proposed_driver REFERENCES driver(id) ON DELETE RESTRICT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE reservation_request DROP COLUMN proposed_driver_id`);
  }
}
