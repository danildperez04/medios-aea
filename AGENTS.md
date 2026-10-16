# AGENTS.md

Instrucciones para asistentes de código (Claude, Cursor, Copilot y similares) que
trabajen en este repositorio. **Léelas antes de escribir o modificar código.**

---

## 1. Contexto

Medios AeA gestiona los vehículos de la Fundación Ayuda en Acción: los técnicos los
solicitan desde el celular, la coordinación logística aprueba desde la web y los
conductores registran cada viaje. Monorepo pnpm con tres workspaces:

| Carpeta  | Aplicación                    | Tecnología                                         |
| -------- | ----------------------------- | -------------------------------------------------- |
| `api`    | API REST                      | NestJS 12 + TypeORM 1 + PostgreSQL 16 (ESM)        |
| `web`    | Panel de la coordinación      | React 19 + Vite 8 + MUI + TanStack Query           |
| `mobile` | App de técnicos y conductores | Expo SDK 57 + expo-router (ver `mobile/AGENTS.md`) |

| Dato                                               | Valor                                                                |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| Idioma de la documentación, comentarios e interfaz | Español                                                              |
| Idioma del código, identificadores y commits       | Inglés                                                               |
| Tablas y columnas                                  | Inglés, `snake_case`, singular                                       |
| Claves primarias                                   | `uuid` (`gen_random_uuid()`)                                         |
| Fechas                                             | `timestamptz` en BD; `America/Managua` y `dd/mm/aaaa` en la interfaz |

## 2. Documentos obligatorios

| Voy a trabajar en…          | Debo leer                                                         |
| --------------------------- | ----------------------------------------------------------------- |
| Cualquier cosa              | `docs/14-arquitectura.md` y `docs/12-plan-pruebas.md`             |
| Base de datos o migraciones | `docs/10-esquema-base-de-datos.md`                                |
| Reservas, disponibilidad    | `docs/02-prd-mvp-moscow.md` §2 (reglas de negocio) y `docs/10` §4 |
| Commits o ramas             | `docs/05-versionado-commits-y-ramas.md`                           |

## 3. Reglas innegociables

1. **La regla anti-choque vive en la base de datos.** Las restricciones
   `ex_assignment_resource_overlap` y `ex_assignment_driver_overlap` nunca se
   eliminan ni se relajan. El servicio valida antes para dar un buen mensaje, pero
   la garantía es la restricción.
2. **Los periodos son semiabiertos `[inicio, fin)`.** Usa `common/utils/time-range.ts`;
   no compares fechas a mano con `<=`.
3. **Las asignaciones nunca se borran.** Cancelar o reasignar pone `active = false`.
4. **El esquema cambia solo por migración** escrita a mano en
   `api/src/database/migrations/`. `synchronize` siempre `false`.
5. **Relaciones de TypeORM tipadas con `Relation<T>`**: el proyecto es ESM y sin eso
   las importaciones circulares entre entidades revientan al arrancar.
6. **El rol se valida en el servidor** con `@Roles()`. Ocultar una opción en la web o
   la app no es seguridad.
7. **Mensajes de error en español y accionables**; nunca SQL ni trazas al cliente.

## 4. DTO (API)

Siguen la documentación de NestJS (_Validation_ y _Mapped types_):

- **Un DTO por archivo** en `modules/<módulo>/dto/`: `create-x.dto.ts`, `update-x.dto.ts`,
  `x-filters.dto.ts`. Nunca definidos dentro del controlador.
- **El update deriva del create** con los mapped types de `@nestjs/swagger` (conservan la
  documentación de Swagger): `PartialType(CreateXDto, { skipNullProperties: false })`,
  `OmitType`, `PickType`. `skipNullProperties: false` es obligatorio: sin él `null` salta
  la validación y una columna NOT NULL termina en 500.
- Campos opcionales que no admiten `null`: `@IsOptionalNonNull()` (`common/validation/optional.ts`),
  no `@IsOptional()`.
- Reglas compartidas: `@IsStrongPassword()` (`common/validation/password.policy.ts`),
  `@Trim()` / `@TrimUpperCase()` (`common/transformers/string.transformers.ts`).
- Cada DTO nuevo con reglas propias se agrega a `common/validation/dto-contracts.spec.ts`.

## 5. Comandos

```bash
pnpm install
pnpm db:up                  # PostgreSQL en localhost:5433 (+ base medios_aea_test)
cp api/.env.example api/.env
pnpm db:migrate && pnpm db:seed   # esquema + datos de ejemplo (contraseña MediosAea2026)
pnpm dev                    # API :3000 + web :5173
pnpm dev:mobile             # Expo (escanear QR con Expo Go o dev build)

pnpm lint && pnpm typecheck && pnpm test   # antes de dar algo por terminado
pnpm test:e2e                              # requiere pnpm db:up
```

## 6. Git

Conventional Commits con los alcances de `commitlint.config.mjs`. Ramas
`feature/hu-XX-<slug>` desde `develop`.
