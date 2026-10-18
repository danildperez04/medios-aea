# Estado del Proyecto — Medios AeA

**Última actualización:** 18 de octubre de 2026
**Versión publicada:** `0.3.0` (etiqueta `v0.3.0`; ver `CHANGELOG.md`)

## Resumen

| Bloque                                                        | Estado                     | Versión           |
| ------------------------------------------------------------- | -------------------------- | ----------------- |
| Sprint 0 — Documentación y andamiaje                          | TERMINADO                  | `v0.1.0`          |
| Sprint 1 — Acceso y catálogos base                            | TERMINADO                  | `v0.2.0`          |
| Sprint 2 — Flota y disponibilidad (+ despliegue, DTO, diseño) | TERMINADO                  | `v0.3.0`          |
| Sprint 3 — Solicitudes y aprobación                           | EN CURSO (HU-09 terminada) | `0.4.0` al cerrar |
| Revisión de DevOps, calidad, seguridad y proceso              | EN REVISIÓN (5 PR)         | —                 |

---

## Sprint 0 — Documentación y andamiaje · TERMINADO

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

## Sprint 1 — Acceso y catálogos base · TERMINADO

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

## Despliegue (contenedores) · TERMINADO

Rama `feature/deployment-containers` (sobre la del Sprint 1).

- Imágenes `api` (Node 24 alpine, usuario `node`, migra al arrancar) y `web` (nginx
  con plantilla `PORT` / `API_UPSTREAM`). Mismas imágenes para servidor propio y PaaS.
- La API acepta `DATABASE_URL` (PaaS) o las variables sueltas (Compose).
- `docker-compose.prod.yml` + `scripts/compose-prod.sh`, `backup.sh`, `restore.sh`,
  scripts `pnpm prod:*`. App móvil: `app.config.ts` + `eas.json` para APK.
- Guía `docs/11-guia-despliegue.md`. Job de CI que construye ambas imágenes.
- Corregido: `create-admin` terminaba en silencio sin crear nada con stdin redirigido;
  cabeceras de seguridad de nginx perdidas en rutas con `add_header` propio.

**Resuelto:** las imágenes ya no se construyen en el servidor: se publican en GHCR con cada release.

## Sistema de diseño con la marca AeA · TERMINADO

Rama `feature/brand-design-system`. Aplicado a partir del manual de marca de Ayuda en
Acción (`docs/16-sistema-de-diseno.md`).

- Web: paleta y tipografía de marca, `BrandLockup`, `ResourceTag` y `AgendaBoard`
  genéricos para cualquier tipo de medio, menú agrupado sin íconos, login con el panel
  naranja del manual, tablas que se apilan en el teléfono, textos sin menciones a sprints.
- Móvil: mismas fuentes y colores, login y pantalla de inicio con la marca; vista
  previa web con `react-native-web`.
- Verificado con capturas a 1366 px y 390 px: sin scroll horizontal ni errores de JS.

**Pendiente con comunicación:** archivo oficial del logo y licencia de Bogart.

## Sprint 2 — Flota y disponibilidad · TERMINADO

Rama `feature/sprint-2-fleet` (sobre la del sistema de diseño).

- **HU-05 Vehículos**: `/vehicles` (resource + vehicle en transacción), placa única,
  odómetro que solo aumenta, mantenimiento y baja lógica. Web: tabla, alta/edición,
  mantenimiento y baja.
- **HU-06 Conductores**: `/drivers` vincula un usuario DRIVER con su licencia; estado
  vigente / por vencer / vencida en hora de Managua. Web: tabla y aviso en "Hoy".
- **HU-07 Bloqueos**: `/resources/:id/blackouts` para cualquier medio; choque con un
  viaje aprobado → 409 con el detalle. Web: diálogo de bloqueos por vehículo.
- **HU-08 Disponibilidad**: `/availability` (medios, con motivos) y
  `/availability/drivers`. Base para la aprobación del Sprint 3 y la app del Sprint 4.
- **Agenda real en "Hoy"**: `/agenda` con viajes, bloqueos, mantenimiento y solicitudes
  pendientes con medio preferido.
- Seeder: 3 vehículos, 2 licencias (una por vencer) y un bloqueo para mañana.

### Verificación

| Workspace | Lint | Typecheck | Pruebas                |
| --------- | ---- | --------- | ---------------------- |
| api       | ✓    | ✓         | 107 unitarias · 56 e2e |
| web       | ✓    | ✓         | 28                     |

Recorrido en Chromium sobre la base de desarrollo: alta de vehículo (placa normalizada,
duplicada → 409), mantenimiento, bloqueo, reflejo inmediato en "Hoy", licencias por
vencer; sin scroll horizontal a 1366 px ni a 390 px. Se corrigieron en el camino: un
texto oculto con `width: 1` (100% en MUI) que desbordaba la página, bloques de varios
días mal ubicados en la agenda, y la petición fallida de la fuente Bogart.

## Sprint 3 — Solicitudes y aprobación sin choques · EN CURSO

Primera historia con el flujo de una rama por historia (`docs/05` §3).

| Historia                            | Rama                           | Estado                                      |
| ----------------------------------- | ------------------------------ | ------------------------------------------- |
| HU-09 Crear y consultar solicitudes | `feature/hu-09-create-request` | TERMINADO (PR #7)                           |
| HU-10 a HU-15                       | —                              | Pendientes; HU-10 a HU-13 dependen de HU-09 |

HU-09: `POST /reservations` (queda PENDING, código `SOL-AAAA-NNNNN`, aviso interno a la
coordinación, RN-06 y RN-14), `GET /reservations` (cada técnico solo las suyas),
bandeja de solicitudes en la web con contador en el menú. Verificación: 113 unitarias,
69 e2e y 30 web en verde; revisada en el navegador a 1366 y 390 px.

## Revisión de DevOps, calidad, seguridad y proceso · EN REVISIÓN

Hecha el 18/10/2026 sobre todo el repositorio. PR independientes desde `develop`:

| PR  | Rama                       | Qué cambia                                                                                                                                                                                                                  |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ci/pipeline-hardening`    | Job de calidad (formato, commits y título del PR), cobertura con umbrales reales (la API medía 33 % por error: es 90 % con e2e), acciones fijadas a SHA, ESLint en el pre-commit, pruebas del móvil (jest-expo), CODEOWNERS |
| 2   | `chore/security-baseline`  | gitleaks, `pnpm audit`, Trivy, CodeQL, Dependabot, `SECURITY.md`, panel sin root, CSP                                                                                                                                       |
| 2b  | `fix/security-hardening`   | Cuenta desactivada o rol cambiado: efecto inmediato (antes, hasta 8 h); Swagger apagado en producción                                                                                                                       |
| 3   | `build/release-automation` | release-please, versiones a `0.3.0`, `CHANGELOG.md`, etiquetas `v0.1.0`–`v0.3.0`, imágenes publicadas en GHCR                                                                                                               |
| 4   | `docs/process-and-review`  | Plantillas de issues, `CONTRIBUTING.md`, guía de revisión, ADR, proceso con GitHub Issues/Projects                                                                                                                          |
| 5   | `chore/github-setup`       | Script de configuración de GitHub (etiquetas, milestones, issues, protección de ramas, tablero)                                                                                                                             |

## Siguiente en el Sprint 3

HU-09 a HU-15: crear y cancelar solicitudes, aprobar asignando medio y conductor con la
disponibilidad de este sprint (mismo candado que los bloqueos), rechazo con motivo,
reasignación, calendario semanal y auditoría.
