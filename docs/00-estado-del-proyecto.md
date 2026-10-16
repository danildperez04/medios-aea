# Estado del Proyecto — Medios AeA

**Última actualización:** 16 de octubre de 2026
**Versión:** `0.1.0` (Sprint 0)

---

## Sprint 0 — Documentación y andamiaje · EN CURSO

### Hecho

- Documentación base: definición, PRD con reglas de negocio, backlog, plan Scrum,
  convenciones, esquema de BD, arquitectura, plan de pruebas y glosario.
- Monorepo pnpm (`api`, `web`, `mobile`) con Prettier, commitlint, husky y CI de
  GitHub Actions.
- **API**: configuración validada, JWT + guard de roles, filtro de errores
  (incluye `23P01` → 409), health check, Swagger, login por correo.
- **Esquema completo** en la migración inicial, con las restricciones de exclusión
  anti-choque de vehículo y de conductor.
- **Web**: login (solo ADMIN), layout con el menú definitivo, dashboard y
  marcadores de las secciones por sprint.
- **Móvil**: login con token en SecureStore, zona autenticada que distingue el rol.

### Verificación

| Workspace | Lint | Typecheck | Pruebas                      | Build                                        |
| --------- | ---- | --------- | ---------------------------- | -------------------------------------------- |
| api       | ✓    | ✓         | 51 unitarias · 16 e2e        | ✓ (migraciones + arranque)                   |
| web       | ✓    | ✓         | 8                            | ✓                                            |
| mobile    | ✓    | ✓         | — (jest-expo en el Sprint 4) | ✓ (`expo export` Android, expo-doctor 21/21) |

Las pruebas e2e incluyen PT-11: PostgreSQL rechaza por sí solo dos asignaciones
activas solapadas del mismo vehículo o del mismo conductor, y acepta las contiguas.

### Pendiente para cerrar el sprint

- Definir la licencia del código con la fundación (hoy `UNLICENSED`).
- Validar el documento 01 con la coordinación logística.
- PR y merge a `develop`.

## Siguiente: Sprint 1 — Acceso y catálogos base

HU-01 a HU-04: CRUD de usuarios y proyectos (API + web), cambio de contraseña,
seeder con datos de ejemplo y script `create-admin`.
