# Plan de Pruebas — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026

---

## 1. Niveles

| Nivel        | Herramienta                        | Dónde                        | Qué cubre                                    |
| ------------ | ---------------------------------- | ---------------------------- | -------------------------------------------- |
| Unitarias    | Vitest                             | `api/src/**/*.spec.ts`       | Reglas de negocio con repositorios simulados |
| e2e API      | Vitest + Supertest + Postgres real | `api/test/**/*.e2e-spec.ts`  | Endpoints, restricciones de BD, concurrencia |
| Web          | Vitest + Testing Library           | `web/src/**/*.test.tsx`      | Formularios, bandeja, calendario             |
| Móvil        | Jest (jest-expo) + Testing Library | `mobile/**/*.test.tsx`       | Pantallas y hooks clave                      |
| Manual / UAT | Lista de verificación              | `docs/15-checklist-uat-*.md` | Flujo real con usuarios de la fundación      |

Las pruebas e2e usan una base `medios_aea_test` en el contenedor de Postgres de
`docker-compose.yml`; se ejecutan las migraciones antes de la suite y se limpian las
tablas entre pruebas.

## 2. Casos críticos (obligatorios)

### Disponibilidad y choques

| ID    | Caso                                                                   | Esperado          |
| ----- | ---------------------------------------------------------------------- | ----------------- |
| PT-01 | Solicitud 08:00–12:00, asignación existente 10:00–14:00 mismo vehículo | 409               |
| PT-02 | Asignación existente 06:00–08:00, nueva 08:00–10:00 (contiguas)        | 200 (sin choque)  |
| PT-03 | Nueva contenida dentro de una existente                                | 409               |
| PT-04 | Mismo horario, vehículos distintos, mismo conductor                    | 409 (conductor)   |
| PT-05 | Vehículo con bloqueo de mantenimiento en el rango                      | 409               |
| PT-06 | Vehículo en estado `MAINTENANCE`                                       | 422               |
| PT-07 | Pasajeros > capacidad                                                  | 422               |
| PT-08 | Conductor con licencia vencida a la fecha del viaje                    | 422               |
| PT-09 | **Dos aprobaciones concurrentes** (`Promise.all`) mismo vehículo/rango | Una 200, otra 409 |
| PT-10 | Cancelar una aprobada libera el vehículo: otra aprobación en el rango  | 200               |
| PT-11 | Inserción directa en BD de dos asignaciones activas solapadas          | Error `23P01`     |

### Flujo

| ID    | Caso                                                                                                              |
| ----- | ----------------------------------------------------------------------------------------------------------------- |
| PT-20 | REQUESTER crea → ADMIN aprueba → DRIVER inicia y finaliza → `COMPLETED`, odómetro actualizado, reporte refleja km |
| PT-21 | REQUESTER no puede aprobar (403); DRIVER no ve solicitudes ajenas                                                 |
| PT-22 | Rechazo sin motivo → 400                                                                                          |

## 3. Criterios de salida por sprint

- 100% de casos críticos del sprint en verde.
- Cobertura ≥ 80% en `availability` y `reservations`.
- `pnpm lint && pnpm typecheck && pnpm test` limpios.

## 4. Cobertura (la exige CI)

| Workspace | Cómo se mide                                                                                                                           | Umbral (sentencias · ramas · funciones · líneas) | Medido el 18/10/2026      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------- |
| api       | `pnpm --filter @medios-aea/api test:cov`: unitarias **y** e2e en una sola corrida (`vitest.coverage.config.ts`; requiere `pnpm db:up`) | 88 · 72 · 90 · 90                                | 90.2 · 75.4 · 93.6 · 93.2 |
| web       | `pnpm --filter @medios-aea/web test:cov`                                                                                               | 21 · 17 · 18 · 21                                | 21.4 · 17.0 · 18.8 · 21.4 |
| mobile    | `pnpm --filter @medios-aea/mobile test` (jest-expo)                                                                                    | — (8 pruebas: cliente HTTP, sesión, login)       | —                         |

Reglas:

- Los umbrales son el valor medido **redondeado hacia abajo**: solo pueden subir. Quien
  sube la cobertura de forma estable actualiza el umbral en el mismo PR.
- La API se mide con unitarias + e2e porque la mayoría de sus reglas se prueban contra
  PostgreSQL real; medir solo unitarias daba ~33 % y no reflejaba lo cubierto.
- La web está baja (deuda registrada): cada pantalla nueva entra con sus pruebas.
- CI publica el resumen en la pestaña del job y deja el reporte HTML como artefacto
  (`coverage-api`, `coverage-web`, 14 días).

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
