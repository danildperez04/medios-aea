# Estado del Proyecto — Medios AeA

**Última actualización:** 18 de noviembre de 2026
**Versión publicada:** `0.4.0` (etiqueta `v0.4.0`; ver `CHANGELOG.md`)

## Resumen

| Bloque                                                        | Estado                                             | Versión           |
| ------------------------------------------------------------- | -------------------------------------------------- | ----------------- |
| Sprint 0 — Documentación y andamiaje                          | TERMINADO                                          | `v0.1.0`          |
| Sprint 1 — Acceso y catálogos base                            | TERMINADO                                          | `v0.2.0`          |
| Sprint 2 — Flota y disponibilidad (+ despliegue, DTO, diseño) | TERMINADO                                          | `v0.3.0`          |
| Revisión de DevOps, calidad, seguridad y proceso              | TERMINADO (PR #8–#13)                              | `v0.4.0`          |
| Sprint 3 — Solicitudes y aprobación                           | TERMINADO                                          | `v0.4.0`          |
| Sprint 4 — App móvil del solicitante y sesiones               | HISTORIAS TERMINADAS (faltan #73 y probar el push) | `0.5.0` al cerrar |

La `v0.4.0` (16/11/2026) reúne la revisión de DevOps y todo el Sprint 3. Se publicó sin
imágenes de Docker: el escaneo del release encontró una vulnerabilidad crítica corregida
en un paquete de Alpine. #116 aplica los parches del sistema al construir; las imágenes
salen con la `0.5.0` (PR de release #118).

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

## Sprint 3 — Solicitudes y aprobación sin choques · TERMINADO

Primera historia con el flujo de una rama por historia (`docs/05` §3).

| Historia                            | Rama                             | Estado              |
| ----------------------------------- | -------------------------------- | ------------------- |
| HU-09 Crear y consultar solicitudes | `feature/hu-09-create-request`   | TERMINADO (PR #7)   |
| HU-10 Cancelar una solicitud        | `feature/hu-10-cancel-request`   | TERMINADO (PR #49)  |
| HU-26 Indicar quién conduce         | `feature/hu-26-proposed-driver`  | TERMINADO (PR #52)  |
| HU-11 Aprobar sin choques           | `feature/hu-11-approve-request`  | TERMINADO (PR #61)  |
| HU-12 Rechazar con motivo           | `feature/hu-12-reject-request`   | TERMINADO (PR #67)  |
| HU-13 Reasignar medio o conductor   | `feature/hu-13-reassign-request` | TERMINADO (PR #70)  |
| HU-27 Reserva desde el panel        | `feature/hu-27-book-from-panel`  | TERMINADO (PR #91)  |
| HU-14 Calendario de la flota        | `feature/hu-14-fleet-calendar`   | TERMINADO (PR #105) |
| HU-15 Auditoría de decisiones       | `feature/hu-15-decision-history` | TERMINADO (PR #106) |

HU-09: `POST /reservations` (queda PENDING, código `SOL-AAAA-NNNNN`, aviso interno a la
coordinación, RN-06 y RN-14), `GET /reservations` (cada técnico solo las suyas),
bandeja de solicitudes en la web con contador en el menú. Verificación: 113 unitarias,
69 e2e y 30 web en verde; revisada en el navegador a 1366 y 390 px.

HU-10: `POST /reservations/:id/cancel` para el dueño o la coordinación (RN-13). Cancela
pendientes y aprobadas mientras el viaje no inicie; las asignaciones pasan a
`active = false` (RN-10), queda en `audit_log` y se avisa a la coordinación, a quien
pidió y al conductor. Botón de cancelar con confirmación en la bandeja web.
Verificación: 122 unitarias, 77 e2e y 33 web en verde; revisada en el navegador a 1366
y 390 px.

HU-26 (ADR 0004): cualquier usuario puede tener perfil de conductor; la solicitud
guarda al conductor propuesto (`proposed_driver_id`, migración `AddProposedDriver`). Sin
indicarlo conduce quien solicita, si tiene licencia; si no, hay que elegir a alguien de
`GET /drivers/options`, cuya licencia debe cubrir el viaje (RN-15). La bandeja muestra
quién conduce y el rol `DRIVER` pasa a llamarse "Chofer de planta". Verificación: 126
unitarias, 83 e2e y 34 web en verde; revisada en el navegador a 1366 y 390 px.

HU-11: `POST /reservations/:id/approve` (ADMIN) asigna el medio y, por defecto, al
conductor propuesto; la coordinación puede elegir a otra persona y se avisa a quien
pidió y a ambos conductores (ADR 0004). En una transacción bloquea la solicitud y el
medio con FOR UPDATE (el mismo candado de los bloqueos) y valida choques (409),
mantenimiento, capacidad y licencia (422); las restricciones de exclusión siguen siendo
la garantía ante aprobaciones simultáneas. En la web, diálogo de aprobación que solo
ofrece medios y conductores libres. Verificación: 135 unitarias, 96 e2e (PT-01 a PT-10)
y 39 web en verde; revisada en el navegador a 1366 y 390 px.

HU-12: `POST /reservations/:id/reject` (ADMIN) exige un motivo de 5 a 300 caracteres
(PT-22), lo guarda con quién decidió y cuándo, deja registro en `audit_log` y avisa a
quien pidió con el motivo. Comparte con la aprobación el candado de la solicitud: si
alguien aprueba y otra persona rechaza a la vez, solo una decisión queda (409 la otra).
En la web, diálogo de rechazo y el motivo bajo el estado de las rechazadas.
Verificación: 136 unitarias, 101 e2e y 43 web en verde; revisada en el navegador a
1366 y 390 px.

HU-13: `POST /reservations/:id/reassign` (ADMIN) cambia el medio, quien conduce o ambos
de una aprobada mientras el viaje no inicie. En una transacción la asignación vigente
pasa a `active = false` y se crea otra (RN-10), con las mismas validaciones que al
aprobar (`checkAssignable`), sin contar la asignación propia como choque. Avisa a quien
pidió, a quien conduce y a quien dejó de conducir; auditoría con el antes y el después.
En la web, el diálogo de aprobación en modo "reasignar". Verificación: 137 unitarias,
107 e2e y 45 web en verde; revisada en el navegador a 1366 y 390 px.

HU-27: `POST /reservations/book` (ADMIN) registra una reserva ya aprobada en un paso, sin
pasar por la bandeja. Valida lo mismo que crear (horario, proyecto activo, persona
activa) y que aprobar (`checkAssignable`: choques, bloqueos, mantenimiento, capacidad y
licencia); quien conduce queda como propuesto. Avisa a quien viaja y a quien conduce, no
a la coordinación, y queda en `audit_log` como aprobación con `direct: true`. En la web,
botón "Nueva reserva" en Solicitudes con un formulario que solo ofrece medios y
conductores libres en el horario. Verificación: 147 unitarias, 124 e2e y 57 web en verde.

HU-14: la sección Agenda del panel (`/agenda`) muestra una fila por medio con sus viajes
aprobados, viajes en curso, solicitudes pendientes con medio preferido y bloqueos, por día
o por semana. `AgendaBoard` acepta `days`: con 7 dibuja una columna por día con la misma
franja horaria, y un viaje de varios días sigue de una columna a la otra. Se navega con
anterior, hoy, siguiente y un selector de fecha; la vista y el día van en la URL y el
encabezado de un día en la semana lo abre hora por hora. `AgendaLegend` explica los
colores. Verificación: 77 web en verde; revisada con datos de ejemplo a 1366 y 390 px.

HU-15: `GET /reservations/:id/history` (ADMIN) lee lo que aprobar, rechazar, cancelar y
reasignar dejaron en `audit_log` y devuelve cada paso en orden, con quién lo hizo, cuándo
y una frase que lo explica (medio y conductor asignados, motivo del rechazo, qué cambió
una reasignación). En la web, cada solicitud ya decidida abre su historial desde la
bandeja. Verificación: 177 unitarias, 131 e2e y 62 web en verde.

### Correcciones tras la revisión del 16/11/2026

| PR   | Qué cambia                                                                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| #102 | `TRUST_PROXY_HOPS`: el límite de peticiones cuenta por la dirección de quien las hace y no por la del proxy (`docs/11` §1)                         |
| #103 | `@IsDateTimeWithOffset()`: reservas, bloqueos, disponibilidad y agenda rechazan fechas sin hora o sin zona horaria, que el servidor leería en UTC  |
| #104 | La prueba del formulario de reserva directa tiene su propio tiempo límite: con cobertura pasaba de los 5 s y `pnpm test:cov` fallaba sin nada roto |

## Revisión de DevOps, calidad, seguridad y proceso · TERMINADO

Hecha el 18/10/2026 sobre todo el repositorio. PR independientes desde `develop`:

| PR  | Rama                       | Qué cambia                                                                                                                                                                                                                  |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ci/pipeline-hardening`    | Job de calidad (formato, commits y título del PR), cobertura con umbrales reales (la API medía 33 % por error: es 90 % con e2e), acciones fijadas a SHA, ESLint en el pre-commit, pruebas del móvil (jest-expo), CODEOWNERS |
| 2   | `chore/security-baseline`  | gitleaks, `pnpm audit`, Trivy, CodeQL, Dependabot, `SECURITY.md`, panel sin root, CSP                                                                                                                                       |
| 2b  | `fix/security-hardening`   | Cuenta desactivada o rol cambiado: efecto inmediato (antes, hasta 8 h); Swagger apagado en producción                                                                                                                       |
| 3   | `build/release-automation` | release-please, versiones a `0.3.0`, `CHANGELOG.md`, etiquetas `v0.1.0`–`v0.3.0`, imágenes publicadas en GHCR                                                                                                               |
| 4   | `docs/process-and-review`  | Plantillas de issues, `CONTRIBUTING.md`, guía de revisión, ADR, proceso con GitHub Issues/Projects                                                                                                                          |
| 5   | `chore/github-setup`       | Script de configuración de GitHub (etiquetas, milestones, issues, protección de ramas, tablero)                                                                                                                             |

## Sprint 4 — App móvil del solicitante y sesiones · HISTORIAS TERMINADAS

| Historia                              | PR   | Estado    |
| ------------------------------------- | ---- | --------- |
| HU-16 Iniciar sesión en la app        | #121 | TERMINADO |
| HU-28 Sesión renovable de la app      | #122 | TERMINADO |
| HU-29 Cerrar sesiones desde el panel  | #122 | TERMINADO |
| HU-17 Solicitar viendo disponibilidad | #124 | TERMINADO |
| HU-18 Ver y cancelar mis solicitudes  | #127 | TERMINADO |
| HU-19 Avisos: bandeja y push          | #130 | TERMINADO |

HU-16: la sesión guardada se conserva si al abrir no hay señal (pantalla para reintentar)
y la caché se vacía al cerrar sesión, para que la siguiente persona del teléfono no vea
datos de la anterior.

HU-28 (ADR 0003, ampliación): `/auth/mobile-session` entrega un token de acceso de 15
minutos y un refresh token que rota, guardados en SecureStore. La app renueva sola y
repite la petición; varias peticiones comparten una renovación. Vence a los 7 días sin
uso; sin señal no se cierra. La app comprueba la sesión al volver al primer plano y cada 5
minutos. Cambiar o restablecer una contraseña cierra todas las sesiones de la persona
(`user.session_version` dentro del token: efecto inmediato).

HU-29: `POST /users/:id/sessions/revoke` (ADMIN) cierra las sesiones de una persona en el
panel y en la app sin desactivarla, con registro en `audit_log`. En el panel, acción
"Cerrar sesiones" en Usuarios.

HU-17: formulario de nueva solicitud en la app con proyecto, propósito, destino, personas,
día, salida, regreso y quién conduce; antes de enviar muestra cuántos vehículos están
libres. Las fechas van con la hora de Nicaragua.

HU-18: el inicio de técnicos y coordinación es "Mis solicitudes", filtrable por estado,
con detalle (vehículo y conductor asignados, motivo del rechazo) y cancelación con
confirmación. `GET /reservations?mine=true` devuelve solo las propias también a la
coordinación.

HU-19: bandeja de avisos (`GET /notifications`, no leídos, marcar leído) y envío push por
Expo. La tabla `notification` hace de cola: `PushDispatcher` envía los pendientes después
de confirmarse, reintenta y olvida los teléfonos donde ya no está la app. Cerrar sesión,
cerrar las sesiones desde el panel o cambiar la contraseña olvidan los teléfonos. Falta
probar el push en un teléfono (tarea `T-PUSH-SETUP` del backlog: `eas init`,
credenciales de FCM y un development build).

### Correcciones y tareas del sprint

| PR   | Qué cambia                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| #116 | Las imágenes aplican los parches de Alpine al construirse: el escaneo bloqueaba la publicación de la `v0.4.0`          |
| #120 | La app explica una respuesta que no es JSON (un 502 del proxy, el portal de una red wifi) en lugar de fallar al leerla |
| #123 | Excepción documentada de `picomatch` (GHSA-fc5q-39xc-vjpf, sin versión corregida) en `SECURITY.md` §4                  |
| #129 | `setup.mjs`, `backup.sh` y `restore.sh` se detienen ante una opción desconocida en vez de ejecutarse                   |
| #128 | Backlog: ocupación actual en Vehículos (#125) y una sola forma de marcar mantenimiento (#126), para el Sprint 5        |

### Verificación

| Workspace | Lint | Typecheck | Pruebas                 |
| --------- | ---- | --------- | ----------------------- |
| api       | ✓    | ✓         | 184 unitarias · 173 e2e |
| web       | ✓    | ✓         | 89                      |
| mobile    | ✓    | ✓         | 86                      |

## Siguiente

**Para cerrar el Sprint 4** (`docs/05` §3.5): actualizar a Expo SDK 58 (#73), probar el
push en un teléfono (`T-PUSH-SETUP`; su issue se crea con `pnpm github:setup --only issues`), mergear el PR de release `0.5.0` (#118) y hacer públicos los
paquetes de GHCR cuando salgan las imágenes (#33).

**Sprint 5 — bitácora y reportes:** HU-20 y HU-21 (los viajes de quien conduce, tenga el
rol que tenga: ADR 0004, RN-16), HU-22 (reportes) y HU-23 (dashboard). Tareas previas:
dividir `reservations.service.ts` (#95) antes de la bitácora, la ocupación actual en
Vehículos (#125, con HU-21) y una sola forma de marcar mantenimiento (#126, antes de
HU-23).
