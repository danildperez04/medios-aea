# Arquitectura — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026

---

## 1. Vista general

```
┌──────────────┐     HTTPS/JSON      ┌──────────────────┐      ┌──────────────┐
│ mobile (Expo)│ ──────────────────▶ │  api (NestJS)    │ ───▶ │ PostgreSQL 16│
│ REQUESTER,   │                     │  /api/v1         │      └──────────────┘
│ DRIVER       │ ◀── Expo Push ───── │                  │
└──────────────┘                     └──────────────────┘
┌──────────────┐     HTTPS/JSON              ▲
│ web (Vite)   │ ────────────────────────────┘
│ ADMIN        │
└──────────────┘
```

| Carpeta  | Aplicación  | Tecnología                                                                      |
| -------- | ----------- | ------------------------------------------------------------------------------- |
| `api`    | API REST    | NestJS 12, TypeORM 1, PostgreSQL 16, Passport-JWT, Swagger                      |
| `web`    | Panel admin | React 19, Vite, TypeScript, TanStack Query, React Router, RHF + zod             |
| `mobile` | App móvil   | Expo SDK 57, expo-router, TanStack Query, expo-secure-store, expo-notifications |

Monorepo **pnpm workspaces**. Docker Compose levanta PostgreSQL en desarrollo y todo el
stack en producción.

## 2. API

### 2.1 Capas

`controller` (HTTP, DTOs con class-validator) → `service` (reglas de negocio,
transacciones) → `repository` de TypeORM. Los controladores no contienen lógica.

### 2.2 Estructura

```
api/src/
├── main.ts                 prefijo /api/v1, helmet, ValidationPipe, Swagger en /docs
├── app.module.ts
├── config/                 validación de env con Joi
├── common/                 guards (JwtAuthGuard, RolesGuard), decoradores (@Roles, @CurrentUser),
│                           filtros (filtro de errores de Postgres → 409), utilidades de rango
├── database/
│   ├── data-source.ts
│   ├── migrations/
│   └── seeders/
└── modules/
    ├── auth/  users/  projects/
    ├── resources/          resource + vehicle (vehicles es una vista tipada de resources)
    ├── drivers/  blackouts/
    ├── availability/       consultas de disponibilidad (solo lectura)
    ├── reservations/       solicitudes, aprobación, rechazo, cancelación, reasignación
    ├── trips/              bitácora del conductor
    ├── notifications/      in-app + Expo Push
    ├── audit/  reports/  health/
```

### 2.3 Aprobación sin choques (secuencia)

```
ReservationsService.approve(id, {resourceId, driverId}, admin)
 └─ dataSource.transaction(async (m) => {
      req   = m.findOne(ReservationRequest, id, lock: pessimistic_write)  // estado = PENDING
      res   = m.findOne(Resource, resourceId, lock: pessimistic_write)    // serializa por vehículo
      check status, capacidad, licencia, blackout              → 409/422 con detalle
      check solape de assignment (consulta explícita)          → 409 con la reserva en conflicto
      m.insert(ReservationAssignment, { period: [starts, ends) })   // la restricción EXCLUDE es la red final
      req.status = APPROVED; audit; notificación (después del commit)
    })
```

El filtro global `PostgresExceptionFilter` convierte `23P01` (exclusión) y `23505`
(único) en `409 Conflict`.

### 2.4 Convenciones

- DTOs de entrada en `dto/`, respuestas tipadas; fechas ISO-8601 con zona.
- Rutas en plural e inglés: `/reservations/:id/approve`.
- Errores en español en `message` (los ve el usuario final).
- Paginación `?page&limit` con respuesta `{ data, meta: { page, limit, total } }`.

## 3. Web

Organización por funcionalidad (`src/features/<feature>/{api,components,pages,schemas}`),
componentes compartidos en `src/components/ui`, cliente HTTP en `src/lib/api.ts`
con interceptor de token. Rutas protegidas por rol `ADMIN`.

## 4. Móvil

```
mobile/
├── app/(auth)/login.tsx
├── app/(app)/(requester)/…   nueva solicitud, mis solicitudes, detalle
├── app/(app)/(driver)/…      mis viajes, iniciar, finalizar
├── app/(app)/notifications.tsx
├── features/<feature>/       api, hooks, componentes
├── lib/api.ts                cliente HTTP + token en expo-secure-store
└── store/                    sesión
```

El layout `(app)` redirige al grupo según el rol del usuario.

## 5. Seguridad

JWT de acceso (8 h), bcrypt (10 rondas), throttler en `/auth/login`, helmet, CORS
restringido a los orígenes de la web, validación estricta (`whitelist`,
`forbidNonWhitelisted`).

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
