import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema inicial de Medios AeA (docs/10-esquema-base-de-datos.md).
 *
 * Se escribe a mano, no con `migration:generate`, porque TypeORM no sabe
 * expresar las restricciones de exclusión GiST que son el corazón del sistema
 * (§4): dos asignaciones activas del mismo vehículo o del mismo conductor no
 * pueden solaparse en el tiempo.
 */
export class InitialSchema1792108800000 implements MigrationInterface {
  name = 'InitialSchema1792108800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // ---------- Tipos ----------
    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('ADMIN', 'REQUESTER', 'DRIVER')`);
    await queryRunner.query(`CREATE TYPE resource_type AS ENUM ('VEHICLE')`);
    await queryRunner.query(
      `CREATE TYPE resource_status AS ENUM ('AVAILABLE', 'MAINTENANCE', 'INACTIVE')`,
    );
    await queryRunner.query(`CREATE TYPE fuel_type AS ENUM ('GASOLINE', 'DIESEL')`);
    await queryRunner.query(
      `CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TYPE blackout_reason AS ENUM ('MAINTENANCE', 'ADMINISTRATIVE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE audit_action AS ENUM ('APPROVE', 'REJECT', 'CANCEL', 'REASSIGN', 'COMPLETE')`,
    );

    // ---------- user ----------
    await queryRunner.query(`
      CREATE TABLE "user" (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name     varchar(120) NOT NULL,
        email         varchar(160) NOT NULL,
        phone         varchar(30),
        password_hash varchar(100) NOT NULL,
        role          user_role NOT NULL,
        is_active     boolean NOT NULL DEFAULT true,
        last_login_at timestamptz,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_user_email ON "user" (lower(email))`);

    // ---------- project ----------
    await queryRunner.query(`
      CREATE TABLE project (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code       varchar(30) NOT NULL CONSTRAINT uq_project_code UNIQUE,
        name       varchar(160) NOT NULL,
        is_active  boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);

    // ---------- resource / vehicle ----------
    await queryRunner.query(`
      CREATE TABLE resource (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        type       resource_type NOT NULL,
        name       varchar(120) NOT NULL,
        status     resource_status NOT NULL DEFAULT 'AVAILABLE',
        notes      text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`
      CREATE TABLE vehicle (
        resource_id        uuid PRIMARY KEY
                           CONSTRAINT fk_vehicle_resource REFERENCES resource(id) ON DELETE CASCADE,
        plate              varchar(20) NOT NULL CONSTRAINT uq_vehicle_plate UNIQUE,
        brand              varchar(60) NOT NULL,
        model              varchar(60) NOT NULL,
        year               smallint,
        passenger_capacity smallint NOT NULL CONSTRAINT ck_vehicle_capacity CHECK (passenger_capacity > 0),
        fuel_type          fuel_type NOT NULL,
        current_odometer   integer NOT NULL DEFAULT 0
                           CONSTRAINT ck_vehicle_odometer CHECK (current_odometer >= 0)
      )`);

    // ---------- driver ----------
    await queryRunner.query(`
      CREATE TABLE driver (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        uuid NOT NULL CONSTRAINT uq_driver_user UNIQUE
                       CONSTRAINT fk_driver_user REFERENCES "user"(id) ON DELETE RESTRICT,
        license_number varchar(40) NOT NULL CONSTRAINT uq_driver_license UNIQUE,
        license_expiry date NOT NULL,
        is_active      boolean NOT NULL DEFAULT true,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )`);

    // ---------- blackout ----------
    await queryRunner.query(`
      CREATE TABLE blackout (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_id uuid NOT NULL
                    CONSTRAINT fk_blackout_resource REFERENCES resource(id) ON DELETE CASCADE,
        period      tstzrange NOT NULL
                    CONSTRAINT ck_blackout_period CHECK (NOT isempty(period) AND NOT lower_inf(period) AND NOT upper_inf(period)),
        reason      blackout_reason NOT NULL,
        description text,
        created_by  uuid CONSTRAINT fk_blackout_user REFERENCES "user"(id) ON DELETE SET NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX ix_blackout_resource_period ON blackout USING gist (resource_id, period)`,
    );

    // ---------- reservation_request ----------
    await queryRunner.query(`
      CREATE TABLE reservation_request (
        id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code                  varchar(20) NOT NULL CONSTRAINT uq_request_code UNIQUE,
        requester_id          uuid NOT NULL
                              CONSTRAINT fk_request_requester REFERENCES "user"(id) ON DELETE RESTRICT,
        project_id            uuid NOT NULL
                              CONSTRAINT fk_request_project REFERENCES project(id) ON DELETE RESTRICT,
        resource_type         resource_type NOT NULL DEFAULT 'VEHICLE',
        preferred_resource_id uuid
                              CONSTRAINT fk_request_preferred_resource REFERENCES resource(id) ON DELETE SET NULL,
        purpose               varchar(300) NOT NULL,
        destination           varchar(200) NOT NULL,
        passengers            smallint NOT NULL CONSTRAINT ck_request_passengers CHECK (passengers > 0),
        starts_at             timestamptz NOT NULL,
        ends_at               timestamptz NOT NULL,
        status                request_status NOT NULL DEFAULT 'PENDING',
        rejection_reason      varchar(300),
        decided_by            uuid CONSTRAINT fk_request_decided_by REFERENCES "user"(id) ON DELETE SET NULL,
        decided_at            timestamptz,
        created_at            timestamptz NOT NULL DEFAULT now(),
        updated_at            timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_request_dates CHECK (ends_at > starts_at)
      )`);
    await queryRunner.query(
      `CREATE INDEX ix_request_status_starts ON reservation_request (status, starts_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_request_requester_starts ON reservation_request (requester_id, starts_at DESC)`,
    );
    // Secuencia para el código legible SOL-<año>-<n>.
    await queryRunner.query(`CREATE SEQUENCE reservation_request_code_seq`);

    // ---------- reservation_assignment ----------
    await queryRunner.query(`
      CREATE TABLE reservation_assignment (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id  uuid NOT NULL
                    CONSTRAINT fk_assignment_request REFERENCES reservation_request(id) ON DELETE CASCADE,
        resource_id uuid NOT NULL
                    CONSTRAINT fk_assignment_resource REFERENCES resource(id) ON DELETE RESTRICT,
        driver_id   uuid CONSTRAINT fk_assignment_driver REFERENCES driver(id) ON DELETE RESTRICT,
        period      tstzrange NOT NULL
                    CONSTRAINT ck_assignment_period CHECK (NOT isempty(period) AND NOT lower_inf(period) AND NOT upper_inf(period)),
        active      boolean NOT NULL DEFAULT true,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      )`);
    // RN-01: un recurso no puede tener dos asignaciones activas solapadas.
    await queryRunner.query(`
      ALTER TABLE reservation_assignment
        ADD CONSTRAINT ex_assignment_resource_overlap
        EXCLUDE USING gist (resource_id WITH =, period WITH &&) WHERE (active)`);
    // RN-02: un conductor no puede tener dos asignaciones activas solapadas.
    await queryRunner.query(`
      ALTER TABLE reservation_assignment
        ADD CONSTRAINT ex_assignment_driver_overlap
        EXCLUDE USING gist (driver_id WITH =, period WITH &&)
        WHERE (active AND driver_id IS NOT NULL)`);
    await queryRunner.query(
      `CREATE INDEX ix_assignment_request ON reservation_assignment (request_id)`,
    );

    // ---------- trip_log ----------
    await queryRunner.query(`
      CREATE TABLE trip_log (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id     uuid NOT NULL CONSTRAINT uq_trip_assignment UNIQUE
                          CONSTRAINT fk_trip_assignment REFERENCES reservation_assignment(id) ON DELETE RESTRICT,
        started_at        timestamptz NOT NULL,
        start_odometer    integer NOT NULL CONSTRAINT ck_trip_start_odometer CHECK (start_odometer >= 0),
        start_fuel_level  smallint NOT NULL CONSTRAINT ck_trip_start_fuel CHECK (start_fuel_level BETWEEN 0 AND 100),
        finished_at       timestamptz,
        end_odometer      integer,
        end_fuel_level    smallint CONSTRAINT ck_trip_end_fuel CHECK (end_fuel_level BETWEEN 0 AND 100),
        fuel_added_liters numeric(6,2) CONSTRAINT ck_trip_fuel_added CHECK (fuel_added_liters >= 0),
        observations      text,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_trip_log_odometer CHECK (end_odometer IS NULL OR end_odometer >= start_odometer),
        CONSTRAINT ck_trip_log_finished CHECK (finished_at IS NULL OR finished_at >= started_at)
      )`);

    // ---------- notification / user_device / audit_log ----------
    await queryRunner.query(`
      CREATE TABLE notification (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    uuid NOT NULL CONSTRAINT fk_notification_user REFERENCES "user"(id) ON DELETE CASCADE,
        title      varchar(120) NOT NULL,
        body       varchar(500) NOT NULL,
        data       jsonb,
        read_at    timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX ix_notification_user_created ON notification (user_id, created_at DESC)`,
    );
    await queryRunner.query(`
      CREATE TABLE user_device (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         uuid NOT NULL CONSTRAINT fk_device_user REFERENCES "user"(id) ON DELETE CASCADE,
        expo_push_token varchar(200) NOT NULL CONSTRAINT uq_device_token UNIQUE,
        platform        varchar(20) NOT NULL,
        last_seen_at    timestamptz NOT NULL,
        created_at      timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`
      CREATE TABLE audit_log (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id   uuid CONSTRAINT fk_audit_actor REFERENCES "user"(id) ON DELETE SET NULL,
        action     audit_action NOT NULL,
        entity     varchar(60) NOT NULL,
        entity_id  uuid NOT NULL,
        payload    jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(`CREATE INDEX ix_audit_entity ON audit_log (entity, entity_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'audit_log',
      'user_device',
      'notification',
      'trip_log',
      'reservation_assignment',
      'reservation_request',
      'blackout',
      'driver',
      'vehicle',
      'resource',
      'project',
      '"user"',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
    await queryRunner.query(`DROP SEQUENCE IF EXISTS reservation_request_code_seq`);
    for (const type of [
      'audit_action',
      'blackout_reason',
      'request_status',
      'fuel_type',
      'resource_status',
      'resource_type',
      'user_role',
    ]) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${type}`);
    }
  }
}
