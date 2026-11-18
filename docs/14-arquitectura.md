# Arquitectura — Medios AeA

**Versión:** 1.3.0
**Fecha:** 16 de noviembre de 2026

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

- DTOs de entrada en `dto/`, respuestas tipadas; fechas ISO-8601 con hora y zona
  (`@IsDateTimeWithOffset()`; sin zona responden 400).
- Rutas en plural e inglés: `/reservations/:id/approve`.
- Errores en español en `message` (los ve el usuario final).
- Paginación `?page&limit` con respuesta `{ data, total, page, limit, totalPages }`.

## 3. Web

```
web/src/
├── app/                    rutas (AppRouter), guards, proveedores, sesión
│   ├── services/           api.ts (cliente HTTP único) · session.ts · api-error.ts
│   └── stores/             auth.store.ts (token de acceso solo en memoria)
├── design-system/          theme · layout (AppLayout) · ui (DataTable, AgendaBoard, …)
├── features/<feature>/     views · components · services (hooks de TanStack Query) · schemas (zod)
│                           agenda, auth, dashboard, drivers, projects, reservations, users, vehicles
└── shared/                 hooks · lib/format.ts (fechas en hora de Managua) · types
```

Cada vista habla con la API solo a través de los hooks de `features/<feature>/services`,
que usan el cliente de `app/services/api.ts`. Todo el panel es exclusivo del rol `ADMIN`
(`app/guards/RequireAuth.tsx`); la API lo valida de nuevo en cada ruta.

Sesión (ADR 0003): el token de acceso vive solo en memoria (`app/stores/auth.store.ts`).
Al abrir o recargar, `restoreSession` pide uno nuevo a `POST /auth/session/refresh` con
la cookie `HttpOnly`; ante un 401, el cliente renueva una sola vez (un refresh compartido
por todas las peticiones) y repite la petición.

## 4. Móvil

```
mobile/src/
├── app/(auth)/login.tsx      inicio de sesión
├── app/(app)/                zona autenticada: `home.tsx` (mis solicitudes), `new-request.tsx`, `requests/[id].tsx`, `trips/[id].tsx` y `notifications.tsx`
├── features/<feature>/       pantallas y llamadas a la API por funcionalidad (`auth`, `requests`, `trips`, `notifications`)
├── lib/                      api.ts (cliente HTTP) · token-storage.ts (expo-secure-store) · config.ts · theme.ts
│                             · managua.ts (fechas con la zona de Nicaragua) · push.ts
└── store/session.ts          sesión
```

Las pantallas de quien solicita (nueva solicitud, mis solicitudes, avisos) están desde el
Sprint 4. "Mis viajes" (HU-20) depende de estar asignado como conductor, no del rol (RN-16,
ADR 0004): un técnico o la coordinación lo ven sobre sus solicitudes cuando conducen
algún viaje, y un chofer de planta solo ve sus viajes. Los avisos para quien conduce
llevan `audience: DRIVER` y abren el viaje. La salida y la llegada llegan con HU-21.

**Avisos (HU-19).** Cada aviso se escribe en `notification` dentro de la transacción que
lo origina y nace `PENDING`. `PushDispatcher` los envía a Expo después de confirmarse:
un segundo después de cada aviso nuevo y cada `PUSH_INTERVAL_MS`, con `FOR UPDATE SKIP
LOCKED` para que dos réplicas no envíen el mismo. Reintenta un error pasajero hasta 3
veces, olvida los teléfonos donde ya no está la app y no envía avisos de más de una hora.
Sin push, el aviso sigue en la bandeja (`GET /notifications`).

## 5. Seguridad

JWT de acceso de 15 min con refresh token rotativo (ADR 0003): en cookie `HttpOnly` para
el panel (`/auth/session`, 12 h sin uso) y en SecureStore para la app
(`/auth/mobile-session`, 7 días sin uso). Cambiar la contraseña cierra todas las sesiones
de la persona. `/auth/login` entrega un token sin renovación para Swagger. Además: bcrypt,
throttler en ambos inicios de sesión (por la dirección real del cliente:
`TRUST_PROXY_HOPS`), helmet, CORS
restringido a los orígenes de la web, validación estricta (`whitelist`,
`forbidNonWhitelisted`).

## Historial

| Versión | Fecha       | Autor        | Cambio                                                                  |
| ------- | ----------- | ------------ | ----------------------------------------------------------------------- |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento                                          |
| 1.1.0   | 16 nov 2026 | Danild Pérez | Estructura real del panel y de la app; forma de la paginación           |
| 1.2.0   | 17 nov 2026 | Danild Pérez | Sesión renovable de la app (HU-28)                                      |
| 1.3.0   | 18 nov 2026 | Danild Pérez | Pantallas de solicitudes y avisos de la app; envío push (HU-17 a HU-19) |
