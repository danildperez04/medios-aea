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

## Sprint 1 — Acceso y catálogos base · EN CURSO

Rama `feature/sprint-1-users-projects` (commits locales, sin push).

### Hecho

- **HU-02 Usuarios** — API `GET/POST/PATCH/DELETE /users`, `PATCH /users/:id/password`
  (solo ADMIN). Correo único sin distinguir mayúsculas; desactivar en lugar de borrar;
  el ADMIN no puede desactivarse ni quitarse el rol a sí mismo. Web: tabla con
  búsqueda, filtros por rol y estado, alta/edición, restablecer contraseña.
- **HU-03 Proyectos** — API `/projects`: el ADMIN gestiona; los demás roles solo ven
  activos. Código normalizado a mayúsculas. Web: tabla, alta/edición, desactivar.
- **HU-04 Cambio de contraseña** — diálogo en la barra superior del panel. Se corrigió
  que una contraseña actual incorrecta (401) cerrara la sesión: ahora es 400.
- **HU-01** — el login del panel admite solo ADMIN y explica a los demás que usen la app.
- Seeder idempotente (`pnpm db:seed`) y script `user:create-admin` para producción.
- `docs/09-matriz-trazabilidad.md`.

### Verificación

| Workspace | Lint | Typecheck | Pruebas               | Build |
| --------- | ---- | --------- | --------------------- | ----- |
| api       | ✓    | ✓         | 66 unitarias · 31 e2e | ✓     |
| web       | ✓    | ✓         | 16                    | ✓     |
| mobile    | ✓    | ✓         | —                     | —     |

Recorrido manual en Chromium headless contra la API real: login de técnico rechazado
en el panel, alta de usuario (validación débil, duplicado por mayúsculas → 409),
búsqueda y desactivación, alta de proyecto con código normalizado, cambio de
contraseña con la actual incorrecta sin perder la sesión.

## Despliegue (contenedores) · EN CURSO

Rama `feature/deployment-containers` (sobre la del Sprint 1).

- Imágenes `api` (Node 24 alpine, usuario `node`, migra al arrancar) y `web` (nginx
  con plantilla `PORT` / `API_UPSTREAM`). Mismas imágenes para servidor propio y PaaS.
- La API acepta `DATABASE_URL` (PaaS) o las variables sueltas (Compose).
- `docker-compose.prod.yml` + `scripts/compose-prod.sh`, `backup.sh`, `restore.sh`,
  scripts `pnpm prod:*`. App móvil: `app.config.ts` + `eas.json` para APK.
- Guía `docs/11-guia-despliegue.md`. Job de CI que construye ambas imágenes.
- Corregido: `create-admin` terminaba en silencio sin crear nada con stdin redirigido;
  cabeceras de seguridad de nginx perdidas en rutas con `add_header` propio.

**Pendiente:** reconstruir la imagen `api` con el `create-admin` corregido; el disco del
equipo de desarrollo se llenó durante las pruebas (ver informe de la sesión).

## Sistema de diseño con la marca AeA · EN CURSO

Rama `feature/brand-design-system`. Aplicado a partir del manual de marca de Ayuda en
Acción (`docs/16-sistema-de-diseno.md`).

- Web: paleta y tipografía de marca, `BrandLockup`, `ResourceTag` y `AgendaBoard`
  genéricos para cualquier tipo de medio, menú agrupado sin íconos, login con el panel
  naranja del manual, tablas que se apilan en el teléfono, textos sin menciones a sprints.
- Móvil: mismas fuentes y colores, login y pantalla de inicio con la marca; vista
  previa web con `react-native-web`.
- Verificado con capturas a 1366 px y 390 px: sin scroll horizontal ni errores de JS.

**Pendiente con comunicación:** archivo oficial del logo y licencia de Bogart.

## Siguiente: Sprint 2 — Flota y disponibilidad

HU-05 a HU-08: vehículos (`resource` + `vehicle` en una transacción), conductores con
licencia, bloqueos por mantenimiento y endpoint de disponibilidad.
