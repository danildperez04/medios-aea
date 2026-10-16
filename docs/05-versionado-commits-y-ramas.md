# Versionado, Commits y Ramas — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026

---

## 1. Versionado

**Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`). Cada sprint cerrado sube MINOR
(ver tabla en `04-plan-scrum.md`); `1.0.0` es el primer despliegue en producción.
Los tres workspaces (`api`, `web`, `mobile`) y la raíz comparten versión. La API se
publica bajo `/api/v1`; un cambio incompatible de contrato exige `/api/v2`.

## 2. Commits

**Conventional Commits 1.0.0**, validados con commitlint:

```
<tipo>(<alcance>): <descripción en inglés, minúsculas, imperativo>
```

| Tipos | `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert` |
| ----- | -------------------------------------------------------------------------------------------- |

| Alcance                                            | Uso                                   |
| -------------------------------------------------- | ------------------------------------- |
| `auth`, `users`, `projects`                        | Acceso y catálogos base               |
| `vehicles`, `drivers`, `blackouts`, `availability` | Flota                                 |
| `reservations`                                     | Solicitudes, aprobación, reasignación |
| `trips`, `notifications`, `reports`, `audit`       | Resto del dominio                     |
| `api`, `web`, `mobile`                             | Transversal a una aplicación          |
| `db`, `deps`, `docker`, `docs`, `cicd`             | Infraestructura                       |

Ejemplos:

```
feat(reservations): reject overlapping approvals with exclusion constraint
fix(availability): treat ranges as half-open so back-to-back trips do not clash
docs(db): document blackout locking strategy
```

## 3. Ramas

Git Flow simplificado:

| Rama                   | Uso                                                                      |
| ---------------------- | ------------------------------------------------------------------------ |
| `main`                 | Producción; solo merges desde `release/*` o `hotfix/*`, con tag `vX.Y.Z` |
| `develop`              | Integración del sprint                                                   |
| `feature/hu-XX-<slug>` | Una historia de usuario, sale de `develop`                               |
| `fix/<slug>`           | Corrección en `develop`                                                  |
| `release/X.Y.0`        | Cierre de sprint                                                         |
| `hotfix/<slug>`        | Corrección urgente desde `main`                                          |

Ejemplo: `feature/hu-11-approve-without-overlap`.

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
