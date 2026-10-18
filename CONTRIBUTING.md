# Cómo contribuir a Medios AeA

Guía corta para trabajar en el proyecto. El detalle de cada tema está en `docs/`.

## 1. Puesta en marcha

Requisitos: Node 22+, pnpm 12, Docker.

```bash
pnpm install
pnpm db:up                     # PostgreSQL en localhost:5433 (+ base de pruebas)
cp api/.env.example api/.env
pnpm db:migrate && pnpm db:seed
pnpm dev                       # API :3000 · web :5173
pnpm dev:mobile                # app con Expo
```

Usuarios de ejemplo: ver `README.md` (contraseña `MediosAea2026`, solo desarrollo).

## 2. De la idea al merge

```
issue ──▶ rama ──▶ commits ──▶ PR ──▶ revisión + CI ──▶ squash merge ──▶ issue cerrado
```

1. **Issue.** Todo trabajo empieza con un issue (plantillas: historia, error, tarea). Se
   asigna al milestone del sprint y aparece en el tablero del proyecto.
2. **Rama** desde `develop` actualizado, una por issue: `feature/hu-11-approve-request`,
   `fix/agenda-overflow`, `build/…`, `docs/…` (`docs/05` §3). Sin ramas por sprint y
   sin ramas encima de otras sin mergear.
3. **Commits** con Conventional Commits y alcance obligatorio:
   `feat(reservations): approve requests without overlapping assignments`. Los hooks
   corren ESLint, Prettier y commitlint en cada commit.
4. **Antes del PR**, en local:
   ```bash
   pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
   pnpm --filter @medios-aea/api test:cov   # si tocaste la API (requiere pnpm db:up)
   ```
5. **PR hacia `develop`** con la plantilla. El título es el commit final (mismo
   formato que un commit) e incluye `Closes #N` en la descripción para cerrar el issue.
   Tamaño ideal: menos de ~400 líneas sin contar pruebas ni lockfile.
6. **Revisión** (`docs/17-revision-de-codigo.md`) y **CI en verde**: calidad, API, web,
   móvil, Docker, seguridad y CodeQL.
7. **Squash merge** y borrar la rama.

Al cerrar el sprint, `develop → main` y release-please prepara la versión
(`docs/05` §1.1).

## 3. Reglas que no se negocian

Las de `AGENTS.md` §3: la regla anti-choque vive en la base de datos, los periodos son
semiabiertos, las asignaciones no se borran, el esquema cambia solo por migración, el
rol se valida en el servidor y los mensajes de error van en español y son accionables.
En la interfaz, `docs/16-sistema-de-diseno.md`.

## 4. Decisiones de arquitectura

Una decisión que cambia cómo se construye el sistema (una librería central, un patrón,
un compromiso de seguridad) se registra como ADR en `docs/adr/` **antes** de
implementarla, con el contexto y las alternativas descartadas.

## 5. Trabajar con asistentes de IA

Se usan asistentes de código (Claude, Copilot…). Reglas:

- El asistente lee `AGENTS.md` y trabaja en la rama de **un** issue.
- Hace commits locales; **el push y los PR los hace la persona responsable**.
- Su código se revisa igual que cualquier otro, con atención especial a lo que
  `docs/17` §4 señala para código generado.
- Quien abre el PR responde por todo lo que contiene, lo haya escrito quien lo haya escrito.

## 6. Seguridad

Las vulnerabilidades se reportan por el canal privado (`SECURITY.md`), nunca en un issue.
