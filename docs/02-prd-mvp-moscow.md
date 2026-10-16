# PRD del MVP (MoSCoW) — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026
**Autor:** Danild Pérez

---

## 1. Requisitos funcionales

| ID    | Requisito                                                              | Prioridad   | Sprint |
| ----- | ---------------------------------------------------------------------- | ----------- | ------ |
| RF-01 | Iniciar sesión con correo y contraseña (JWT)                           | Must        | S1     |
| RF-02 | Control de acceso por rol (`ADMIN`, `REQUESTER`, `DRIVER`)             | Must        | S1     |
| RF-03 | CRUD de usuarios (ADMIN)                                               | Must        | S1     |
| RF-04 | CRUD de proyectos (ADMIN)                                              | Must        | S1     |
| RF-05 | Cambiar la propia contraseña                                           | Should      | S1     |
| RF-06 | CRUD de vehículos como recurso tipo `VEHICLE` (ADMIN)                  | Must        | S2     |
| RF-07 | CRUD de conductores con licencia y vencimiento (ADMIN)                 | Must        | S2     |
| RF-08 | Registrar bloqueos de un vehículo (mantenimiento, uso administrativo)  | Must        | S2     |
| RF-09 | Consultar disponibilidad por rango y nº de pasajeros                   | Must        | S2     |
| RF-10 | Crear solicitud de vehículo                                            | Must        | S3     |
| RF-11 | Cancelar una solicitud propia (pendiente o aprobada, antes de iniciar) | Must        | S3     |
| RF-12 | Aprobar una solicitud asignando vehículo y conductor                   | Must        | S3     |
| RF-13 | Rechazar una solicitud con motivo                                      | Must        | S3     |
| RF-14 | Impedir asignaciones solapadas de vehículo o conductor                 | Must        | S3     |
| RF-15 | Reasignar vehículo/conductor de una solicitud aprobada                 | Should      | S3     |
| RF-16 | Calendario de la flota (vista semana/día por vehículo)                 | Must        | S3     |
| RF-17 | Registro de auditoría de aprobaciones, rechazos y reasignaciones       | Should      | S3     |
| RF-18 | App móvil: login, solicitar, ver mis solicitudes, cancelar             | Must        | S4     |
| RF-19 | Notificaciones in-app                                                  | Must        | S4     |
| RF-20 | Notificaciones push (Expo)                                             | Should      | S4     |
| RF-21 | Conductor: ver mis viajes asignados                                    | Must        | S5     |
| RF-22 | Conductor: registrar salida (km, combustible)                          | Must        | S5     |
| RF-23 | Conductor: registrar llegada (km, combustible, observaciones)          | Must        | S5     |
| RF-24 | Reporte de uso por proyecto y por vehículo                             | Should      | S5     |
| RF-25 | Exportar reportes a CSV                                                | Could       | S5     |
| RF-26 | Dashboard con pendientes, viajes de hoy, licencias por vencer          | Should      | S5     |
| RF-27 | Gestión de otros medios (proyector, laptop, sonido)                    | Won't (MVP) | Fase 2 |
| RF-28 | Rastreo GPS                                                            | Won't       | —      |

## 2. Reglas de negocio

| ID    | Regla                                                                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN-01 | Un recurso no puede tener dos asignaciones **activas** cuyos periodos se solapen.                                                                                                   |
| RN-02 | Un conductor no puede tener dos asignaciones activas cuyos periodos se solapen.                                                                                                     |
| RN-03 | Los periodos son semiabiertos `[inicio, fin)`: un viaje que termina 10:00 no choca con uno que inicia 10:00.                                                                        |
| RN-04 | Un recurso con un bloqueo en el periodo, o en estado `MAINTENANCE`/`INACTIVE`, no se puede asignar.                                                                                 |
| RN-05 | La capacidad de pasajeros del vehículo debe ser ≥ pasajeros de la solicitud (incluido el conductor no).                                                                             |
| RN-06 | `ends_at` debe ser posterior a `starts_at`; la solicitud no puede iniciar en el pasado.                                                                                             |
| RN-07 | Las solicitudes **pendientes** no reservan el vehículo: solo una asignación aprobada lo ocupa. Varias solicitudes pendientes pueden pedir el mismo horario; la coordinación decide. |
| RN-08 | Al aprobar, la API vuelve a validar disponibilidad dentro de la transacción; si alguien aprobó antes, responde `409 Conflict` con la reserva que choca.                             |
| RN-09 | Un conductor con licencia vencida a la fecha del viaje no se puede asignar.                                                                                                         |
| RN-10 | Al cancelar o reasignar, la asignación anterior pasa a `active = false` (no se borra) y se notifica.                                                                                |
| RN-11 | El km de llegada debe ser ≥ km de salida; al finalizar, el km actual del vehículo se actualiza.                                                                                     |
| RN-12 | Una solicitud aprobada pasa a `COMPLETED` cuando el conductor registra la llegada.                                                                                                  |
| RN-13 | Solo el solicitante (o un ADMIN) puede cancelar una solicitud; no se cancela un viaje ya iniciado.                                                                                  |
| RN-14 | El ADMIN puede crear solicitudes en nombre de otra persona (casos urgentes).                                                                                                        |

## 3. Estados de la solicitud

```
           ┌──────── reject ────────▶ REJECTED
PENDING ───┤
           ├──────── cancel ────────▶ CANCELLED
           └─ approve ─▶ APPROVED ──┬─ cancel ─▶ CANCELLED
                           │  ▲     └─ trip finish ─▶ COMPLETED
                           └──┘ reassign
```

## 4. Requisitos no funcionales

| ID     | Requisito                                                                           |
| ------ | ----------------------------------------------------------------------------------- |
| RNF-01 | Contraseñas con bcrypt; JWT de acceso con expiración; rate limiting en login        |
| RNF-02 | Todas las fechas en `timestamptz`; la interfaz muestra `America/Managua`            |
| RNF-03 | La API responde en < 500 ms para disponibilidad con 20 vehículos y 1 año de datos   |
| RNF-04 | Interfaz en español; código, commits e identificadores en inglés                    |
| RNF-05 | Cobertura de pruebas ≥ 80% en servicios de dominio (`availability`, `reservations`) |
| RNF-06 | Despliegue con Docker Compose en un servidor único                                  |
| RNF-07 | App móvil funcional en Android 10+ (principal) e iOS                                |

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
