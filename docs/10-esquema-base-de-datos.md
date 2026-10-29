# Esquema de Base de Datos — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026
**Motor:** PostgreSQL 16 · extensiones `btree_gist`, `pgcrypto`

Convenciones: tablas en inglés, `snake_case`, singular · PK `uuid` (`gen_random_uuid()`)
· fechas `timestamptz` · `created_at`/`updated_at` en todas las tablas · enums como
tipos de PostgreSQL · cambios **solo por migraciones** (nunca `synchronize`).

---

## 1. Diagrama

```
user ─1:0..1─ driver
 │                │
 │ requester      │ driver_id
 ▼                ▼
reservation_request ─1:0..n─ reservation_assignment ─1:0..1─ trip_log
 │        │                        │
 project  preferred_resource       resource ─1:1─ vehicle
                                    │
                                    └─1:n─ blackout
user ─1:n─ notification · user_device · audit_log
```

## 2. Tipos enumerados

| Tipo              | Valores                                                     |
| ----------------- | ----------------------------------------------------------- |
| `user_role`       | `ADMIN`, `REQUESTER`, `DRIVER`                              |
| `resource_type`   | `VEHICLE` (fase 2: `EQUIPMENT`)                             |
| `resource_status` | `AVAILABLE`, `MAINTENANCE`, `INACTIVE`                      |
| `fuel_type`       | `GASOLINE`, `DIESEL`                                        |
| `request_status`  | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `COMPLETED` |
| `blackout_reason` | `MAINTENANCE`, `ADMINISTRATIVE`, `OTHER`                    |
| `audit_action`    | `APPROVE`, `REJECT`, `CANCEL`, `REASSIGN`, `COMPLETE`       |

## 3. Tablas

### `user`

| Columna         | Tipo         | Restricciones            |
| --------------- | ------------ | ------------------------ |
| `id`            | uuid         | PK                       |
| `full_name`     | varchar(120) | not null                 |
| `email`         | varchar(160) | not null, unique (lower) |
| `phone`         | varchar(30)  |                          |
| `password_hash` | varchar(100) | not null                 |
| `role`          | user_role    | not null                 |
| `is_active`     | boolean      | not null, default true   |

### `project`

| Columna     | Tipo         | Restricciones          |
| ----------- | ------------ | ---------------------- |
| `id`        | uuid         | PK                     |
| `code`      | varchar(30)  | not null, unique       |
| `name`      | varchar(160) | not null               |
| `is_active` | boolean      | not null, default true |

### `resource` — abstracción genérica de un medio

| Columna  | Tipo            | Restricciones                 |
| -------- | --------------- | ----------------------------- |
| `id`     | uuid            | PK                            |
| `type`   | resource_type   | not null                      |
| `name`   | varchar(120)    | not null (ej. "Hilux blanca") |
| `status` | resource_status | not null, default `AVAILABLE` |
| `notes`  | text            |                               |

### `vehicle` — detalle 1:1 de un `resource` tipo `VEHICLE`

| Columna              | Tipo        | Restricciones                            |
| -------------------- | ----------- | ---------------------------------------- |
| `resource_id`        | uuid        | PK, FK → `resource.id` on delete cascade |
| `plate`              | varchar(20) | not null, unique                         |
| `brand`              | varchar(60) | not null                                 |
| `model`              | varchar(60) | not null                                 |
| `year`               | smallint    |                                          |
| `passenger_capacity` | smallint    | not null, check > 0                      |
| `fuel_type`          | fuel_type   | not null                                 |
| `current_odometer`   | integer     | not null, default 0, check ≥ 0           |

### `driver`

| Columna          | Tipo        | Restricciones                    |
| ---------------- | ----------- | -------------------------------- |
| `id`             | uuid        | PK                               |
| `user_id`        | uuid        | not null, unique, FK → `user.id` |
| `license_number` | varchar(40) | not null, unique                 |
| `license_expiry` | date        | not null                         |
| `is_active`      | boolean     | not null, default true           |

### `blackout` — periodos en que un recurso no se puede usar

| Columna       | Tipo            | Restricciones                   |
| ------------- | --------------- | ------------------------------- |
| `id`          | uuid            | PK                              |
| `resource_id` | uuid            | not null, FK → `resource.id`    |
| `period`      | tstzrange       | not null, check `lower < upper` |
| `reason`      | blackout_reason | not null                        |
| `description` | text            |                                 |
| `created_by`  | uuid            | FK → `user.id`                  |

### `reservation_request`

| Columna                 | Tipo           | Restricciones                           |
| ----------------------- | -------------- | --------------------------------------- |
| `id`                    | uuid           | PK                                      |
| `code`                  | varchar(20)    | not null, unique (ej. `SOL-2026-00042`) |
| `requester_id`          | uuid           | not null, FK → `user.id`                |
| `project_id`            | uuid           | not null, FK → `project.id`             |
| `resource_type`         | resource_type  | not null, default `VEHICLE`             |
| `preferred_resource_id` | uuid           | FK → `resource.id`                      |
| `proposed_driver_id`    | uuid           | FK → `driver.id` (quién conduce)        |
| `purpose`               | varchar(300)   | not null                                |
| `destination`           | varchar(200)   | not null                                |
| `passengers`            | smallint       | not null, check > 0                     |
| `starts_at`             | timestamptz    | not null                                |
| `ends_at`               | timestamptz    | not null, check `ends_at > starts_at`   |
| `status`                | request_status | not null, default `PENDING`             |
| `rejection_reason`      | varchar(300)   |                                         |
| `decided_by`            | uuid           | FK → `user.id`                          |
| `decided_at`            | timestamptz    |                                         |

Índices: `(status, starts_at)`, `(requester_id, starts_at desc)`.

### `reservation_assignment` — la ocupación real de un recurso

| Columna       | Tipo      | Restricciones                                    |
| ------------- | --------- | ------------------------------------------------ |
| `id`          | uuid      | PK                                               |
| `request_id`  | uuid      | not null, FK → `reservation_request.id`          |
| `resource_id` | uuid      | not null, FK → `resource.id`                     |
| `driver_id`   | uuid      | FK → `driver.id` (null = sin conductor asignado) |
| `period`      | tstzrange | not null, check `lower(period) < upper(period)`  |
| `active`      | boolean   | not null, default true                           |

### `trip_log`

| Columna             | Tipo         | Restricciones                                      |
| ------------------- | ------------ | -------------------------------------------------- |
| `id`                | uuid         | PK                                                 |
| `assignment_id`     | uuid         | not null, unique, FK → `reservation_assignment.id` |
| `started_at`        | timestamptz  | not null                                           |
| `start_odometer`    | integer      | not null, check ≥ 0                                |
| `start_fuel_level`  | smallint     | not null, check 0..100 (porcentaje)                |
| `finished_at`       | timestamptz  |                                                    |
| `end_odometer`      | integer      | check `end_odometer >= start_odometer`             |
| `end_fuel_level`    | smallint     | check 0..100                                       |
| `fuel_added_liters` | numeric(6,2) | check ≥ 0                                          |
| `observations`      | text         |                                                    |

### `notification`, `user_device`, `audit_log`

- `notification(id, user_id, title, body, data jsonb, read_at)`
- `user_device(id, user_id, expo_push_token unique, platform, last_seen_at)`
- `audit_log(id, actor_id, action audit_action, entity varchar, entity_id uuid, payload jsonb)`

### `refresh_token` — sesiones del panel web (ADR 0003)

| Columna      | Tipo        | Restricciones                                     |
| ------------ | ----------- | ------------------------------------------------- |
| `id`         | uuid        | PK                                                |
| `user_id`    | uuid        | not null, FK → `user.id` (cascade)                |
| `family_id`  | uuid        | not null; las rotaciones de una misma sesión      |
| `token_hash` | char(64)    | not null, unique: SHA-256, nunca el valor         |
| `expires_at` | timestamptz | not null (12 h sin uso)                           |
| `used_at`    | timestamptz | cuándo se rotó                                    |
| `revoked_at` | timestamptz | cierre de sesión, reutilización o cuenta inactiva |

Índices: `(family_id)`, `(user_id)`.

## 4. Regla anti-choque (RN-01, RN-02)

Se implementa con **restricciones de exclusión** de PostgreSQL. Así la garantía no
depende del código: aun si dos administradores aprueban al mismo milisegundo, la
segunda inserción falla con el código `23P01` (`exclusion_violation`).

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE reservation_assignment
  ADD CONSTRAINT ex_assignment_resource_overlap
  EXCLUDE USING gist (resource_id WITH =, period WITH &&) WHERE (active);

ALTER TABLE reservation_assignment
  ADD CONSTRAINT ex_assignment_driver_overlap
  EXCLUDE USING gist (driver_id WITH =, period WITH &&)
  WHERE (active AND driver_id IS NOT NULL);
```

- Los rangos se guardan como `tstzrange(starts_at, ends_at, '[)')` — semiabiertos
  (RN-03): terminar a las 10:00 y empezar a las 10:00 no es choque.
- Desactivar una asignación (`active = false`) la saca de la restricción, por eso
  cancelar o reasignar nunca borra filas.
- Los `blackout` viven en otra tabla, así que no entran en la restricción; el
  servicio de aprobación los valida dentro de la misma transacción con
  `SELECT … FOR UPDATE` sobre la fila del `resource` para serializar aprobaciones
  del mismo vehículo. A la inversa, crear un bloqueo bloquea la misma fila y verifica
  que no haya asignaciones activas solapadas.

Índices GiST para disponibilidad: los creados por las restricciones cubren
`(resource_id, period)` y `(driver_id, period)`; se añade `gist (resource_id, period)`
en `blackout`.

## 5. Consulta de disponibilidad (referencia)

```sql
SELECT r.*, v.*
FROM resource r
JOIN vehicle v ON v.resource_id = r.id
WHERE r.type = 'VEHICLE'
  AND r.status = 'AVAILABLE'
  AND v.passenger_capacity >= :passengers
  AND NOT EXISTS (SELECT 1 FROM reservation_assignment a
                  WHERE a.resource_id = r.id AND a.active
                    AND a.period && tstzrange(:from, :to, '[)'))
  AND NOT EXISTS (SELECT 1 FROM blackout b
                  WHERE b.resource_id = r.id
                    AND b.period && tstzrange(:from, :to, '[)'));
```

## 6. Extensión a otros medios (fase 2)

1. `ALTER TYPE resource_type ADD VALUE 'EQUIPMENT'`.
2. Tabla `equipment(resource_id PK/FK, category, serial_number, …)`.
3. Una solicitud ya admite varias filas en `reservation_assignment` (relación 1:n),
   así que pedir vehículo + proyector es crear dos asignaciones. La restricción de
   exclusión no cambia.

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
