# Medios AeA

Sistema de gestión de medios (vehículos) de la **Fundación Ayuda en Acción**.

Los técnicos de proyecto solicitan un vehículo desde el celular, la coordinación
logística aprueba y asigna vehículo y conductor desde el panel web, y el conductor
registra la salida y la llegada de cada viaje. **Un vehículo o un conductor no puede
quedar asignado a dos actividades que se crucen en el tiempo**: lo impide la propia
base de datos.

## Aplicaciones

| Carpeta  | Aplicación                         | Tecnología                          |
| -------- | ---------------------------------- | ----------------------------------- |
| `api`    | API REST                           | NestJS 12 + TypeORM + PostgreSQL 16 |
| `web`    | Panel de la coordinación logística | React 19 + Vite 8 + MUI             |
| `mobile` | App de técnicos y conductores      | Expo SDK 57 + expo-router           |

## Puesta en marcha

Requisitos: Node 22+, pnpm 12, Docker.

```bash
pnpm install
pnpm db:up                                   # PostgreSQL en el puerto 5433
cp api/.env.example api/.env                 # y cambia JWT_SECRET
pnpm db:migrate                              # compila la API y aplica las migraciones
pnpm db:seed                                 # datos de ejemplo (solo desarrollo)
pnpm dev                                     # API http://localhost:3000/api/v1 · web http://localhost:5173
pnpm dev:mobile                              # app móvil con Expo
```

Documentación de la API (Swagger): http://localhost:3000/api/docs

### Usuarios de ejemplo (`pnpm db:seed`)

Todos con la contraseña `MediosAea2026`. Son ficticios, y el seeder se niega a correr
con `NODE_ENV=production`. En producción el primer administrador se crea con
`pnpm --filter @medios-aea/api user:create-admin`.

| Correo                               | Rol               |
| ------------------------------------ | ----------------- |
| `admin@demo.medios-aea.org`          | ADMIN (web)       |
| `ana.martinez@demo.medios-aea.org`   | REQUESTER (móvil) |
| `jose.gutierrez@demo.medios-aea.org` | DRIVER (móvil)    |

## Pruebas

```bash
pnpm lint && pnpm typecheck && pnpm test     # los tres workspaces
pnpm test:e2e                                # API contra PostgreSQL real (requiere pnpm db:up)
```

## Documentación

Toda la documentación del proyecto está en [`docs/`](docs/README.md): definición de
la solución, requisitos y reglas de negocio, backlog, plan Scrum, esquema de base de
datos, arquitectura y plan de pruebas.

## Estado

Ver [`docs/00-estado-del-proyecto.md`](docs/00-estado-del-proyecto.md).
