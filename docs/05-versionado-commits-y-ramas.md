# Versionado, Commits y Ramas — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026

---

## 1. Versionado

**Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`). Cada sprint cerrado sube MINOR
(ver tabla en `04-plan-scrum.md`); `1.0.0` es el primer despliegue en producción.
Los tres workspaces (`api`, `web`, `mobile`) y la raíz comparten versión. La API se
publica bajo `/api/v1`; un cambio incompatible de contrato exige `/api/v2`.

### 1.1 Cómo sale una versión (automatizado)

Las versiones las calcula **release-please** a partir de los Conventional Commits; nadie
edita versiones ni el `CHANGELOG.md` a mano.

1. Al cerrar el sprint se mergea `develop → main` (§3.5).
2. El workflow `Release` (`.github/workflows/release.yml`) abre o actualiza el PR
   `chore(repo): release X.Y.Z` con la versión siguiente en los cuatro `package.json`,
   en `mobile/app.config.ts` y el `CHANGELOG.md` (secciones en español).
3. Se revisa ese PR (¿el CHANGELOG cuenta bien el sprint?) y se mergea.
4. release-please crea la etiqueta `vX.Y.Z` y el GitHub Release, y el mismo workflow
   construye, escanea con Trivy y publica `ghcr.io/danildperez04/medios-aea-api` y
   `-web` con las etiquetas `X.Y.Z`, `X.Y` y `latest`, con procedencia y SBOM.

Antes de la `1.0.0`, un `feat` sube MINOR y un cambio incompatible (`feat!:` o
`BREAKING CHANGE:`) también sube MINOR (`bump-minor-pre-major`). Configuración:
`release-please-config.json` y `.release-please-manifest.json`.

Las versiones `0.1.0` a `0.3.0` se etiquetaron de forma retroactiva en los commits de
cierre de cada sprint al adoptar release-please.

### 1.2 Configuración única en GitHub

1. **Permitir que Actions abra PR:** _Settings → Actions → General → Workflow
   permissions_ → marcar _Allow GitHub Actions to create and approve pull requests_.
2. **Token para release-please** (para que su PR dispare CI y pase los checks
   requeridos de `main`): crear un _fine-grained personal access token_ con acceso
   **solo a este repositorio** y permisos _Contents_, _Pull requests_ e _Issues_ en
   lectura y escritura (_Metadata_ de solo lectura se agrega solo). Guardarlo en
   _Settings → Secrets and variables → Actions_ como `RELEASE_PLEASE_TOKEN`.
   Fijarle vencimiento (p. ej. 1 año) y anotar la fecha para renovarlo.

Sin el secreto el workflow usa `GITHUB_TOKEN`: el PR de release se crea igual, pero
CI no corre sobre él y hay que mergearlo marcando _bypass_ como administrador.

## 2. Commits

**Conventional Commits 1.0.0**, validados con commitlint en tres puntos:

- **Hook `commit-msg`** (husky): cada commit local.
- **Hook `pre-commit`**: lint-staged corre `eslint --fix` y Prettier sobre los archivos
  preparados de cada app (configuración en el `package.json` de `api/`, `web/` y
  `mobile/`); un error de ESLint bloquea el commit.
- **CI, job `quality`**: los commits del PR y el **título del PR**, que es el mensaje
  del commit que queda en `develop` tras el _squash merge_.

El alcance es obligatorio:

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
| `deps-dev`                                         | Dependabot (dependencias de dev.)     |

Ejemplos:

```
feat(reservations): reject overlapping approvals with exclusion constraint
fix(availability): treat ranges as half-open so back-to-back trips do not clash
docs(db): document blackout locking strategy
```

## 3. Ramas y flujo de trabajo

Se trabaja con **ramas cortas por historia de usuario** que vuelven rápido a
`develop` (GitHub Flow sobre `develop`). El sprint es una unidad de planificación,
no de código: **nunca hay una rama por sprint**.

### 3.1 Ramas permanentes

| Rama      | Contenido                                 | Quién escribe                                              |
| --------- | ----------------------------------------- | ---------------------------------------------------------- |
| `main`    | Lo que está (o puede estar) en producción | Solo merges desde `develop` o `hotfix/*`, con tag `vX.Y.Z` |
| `develop` | Historias terminadas e integradas         | Solo PR con CI en verde                                    |

### 3.2 Ramas de trabajo

| Prefijo             | Cuándo                                                                    | Ejemplo                                 |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| `feature/`          | Una historia de usuario                                                   | `feature/hu-11-approve-without-overlap` |
| `fix/`              | Corrección de un bug en `develop`                                         | `fix/agenda-multi-day-blocks`           |
| `refactor/`         | Cambio interno sin comportamiento nuevo                                   | `refactor/nest-dtos`                    |
| `chore/` · `build/` | Trabajo transversal sin historia (despliegue, herramientas, dependencias) | `build/deployment-containers`           |
| `docs/`             | Solo documentación                                                        | `docs/branching-workflow`               |
| `hotfix/`           | Corrección urgente de producción, sale de `main`                          | `hotfix/login-500`                      |

Nombres en inglés, `kebab-case`, con el número de historia cuando lo hay.

### 3.3 Ciclo de una historia

1. **Actualizar `develop`** (`git switch develop && git pull`).
2. **Crear la rama** desde `develop`: `git switch -c feature/hu-09-create-request`.
3. **Commits pequeños** con Conventional Commits (§2). Hooks de husky: Prettier y commitlint.
4. **Antes del PR**: `pnpm lint && pnpm typecheck && pnpm test` (y `pnpm test:e2e` si
   toca la API). Si `develop` avanzó, `git rebase develop`.
5. **Push y PR hacia `develop`** con la plantilla `.github/pull_request_template.md`.
   La rama vive idealmente **1 a 3 días**; el PR, **menos de ~400 líneas** sin contar
   pruebas ni lockfile.
6. **Revisión + CI en verde → _squash merge_**. En `develop` cada historia queda como
   un solo commit, con el título del PR en formato Conventional Commits.
7. **Borrar la rama** (local y remota) y empezar la siguiente desde `develop` actualizado.

### 3.4 Dependencias entre historias: no apilar ramas

Si la historia B necesita código de la historia A, **primero se mergea A** y luego B
sale de `develop`. No se crean ramas encima de otras ramas sin mergear: el PR de la
de arriba arrastra el código de todas las de abajo, y un cambio pedido en la revisión
de la primera hay que propagarlo a mano por las demás.

Si de verdad no se puede esperar, la excepción es un **PR apilado declarado**: el PR
de B apunta a la rama de A (no a `develop`), lo dice en su descripción y, cuando A se
mergea, B se rebasa sobre `develop` y se cambia su destino. Es una excepción, no la
forma normal de trabajar.

Para avanzar sin esperar: partir la historia en pasos que se pueden mergear solos
(primero la API con sus pruebas, después la pantalla) u ocultar lo incompleto detrás
de una ruta que todavía no aparece en el menú.

### 3.5 Cierre de sprint y versiones

1. Todas las historias del sprint mergeadas en `develop`, CI en verde.
2. Actualizar `docs/00-estado-del-proyecto.md`, el backlog y la matriz de trazabilidad.
3. PR `develop → main` titulado `release: vX.Y.0`; después del merge, tag `vX.Y.0` en
   `main` (§1).
4. Si en el sprint hubo cambios de esquema, verificar las migraciones contra una copia
   de la base antes de desplegar (`docs/11-guia-despliegue.md`).

### 3.6 Correcciones urgentes

Rama `hotfix/<slug>` desde `main` → PR a `main` → tag PATCH (`vX.Y.Z+1`) → merge de
`main` a `develop` para que la corrección no se pierda.

### 3.7 Asistentes de código (IA)

- Trabajan en la rama de **una** historia, creada desde `develop` actualizado.
- Hacen commits locales; **el push y los PR los hace la persona responsable**.
- No crean una rama nueva encima de otra que todavía no está mergeada (§3.4): si la
  siguiente historia depende de la anterior, avisan y esperan el merge.

### 3.8 Lección aprendida (sprints 0 a 2)

Los sprints 0 a 2 se trabajaron con cinco ramas apiladas (`sprint-1 ← deployment ←
refactor ← brand ← sprint-2`), cada una por sprint o por tema y creada antes del merge
de la anterior. Funcionó porque se mergearon en orden, pero generó PR grandes y
difíciles de revisar. Desde el Sprint 3 se aplica este flujo: una rama por historia.

## Historial

| Versión | Fecha       | Autor        | Cambio                                                             |
| ------- | ----------- | ------------ | ------------------------------------------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento                                     |
| 1.1.0   | 18 oct 2026 | Danild Pérez | Flujo de ramas por historia, sin apilar; cierre de sprint y hotfix |
