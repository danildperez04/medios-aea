# Backlog del Producto — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026
**Autor:** Danild Pérez

Estados: `PENDIENTE` · `EN CURSO` · `TERMINADO` (PR aprobado y merge a `develop`).

Cada historia tiene su issue en GitHub (`HU-XX: …`, etiqueta `tipo:historia`), donde se
sigue el trabajo del día a día (`04-plan-scrum.md` §2.1). Este documento es la
referencia de producto: qué se construye y con qué criterios.

---

## Sprint 0 — Fundamentos

| HU    | Historia                                                                                | Estado    |
| ----- | --------------------------------------------------------------------------------------- | --------- |
| HU-00 | Como equipo, quiero documentación base y el monorepo andamiado para empezar a construir | TERMINADO |

## Sprint 1 — Acceso y catálogos base

| HU    | RF           | Historia                                                                 | Criterios de aceptación                                                                                         | Estado    |
| ----- | ------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------- |
| HU-01 | RF-01, RF-02 | Como usuario, quiero iniciar sesión para acceder según mi rol            | Credenciales válidas devuelven token y perfil; inválidas → 401; 5 intentos/min por IP; rutas protegidas por rol | TERMINADO |
| HU-02 | RF-03        | Como ADMIN, quiero gestionar usuarios para dar acceso al personal        | Crear con rol; correo único (409); desactivar en lugar de borrar; listar con búsqueda                           | TERMINADO |
| HU-03 | RF-04        | Como ADMIN, quiero gestionar proyectos para cargar los viajes a cada uno | Código único; activar/desactivar; solo los activos aparecen al solicitar                                        | TERMINADO |
| HU-04 | RF-05        | Como usuario, quiero cambiar mi contraseña                               | Exige contraseña actual; mínimo 8 caracteres                                                                    | TERMINADO |

## Sprint 2 — Flota y disponibilidad

| HU    | RF    | Historia                                                          | Criterios de aceptación                                                                                                | Estado    |
| ----- | ----- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- |
| HU-05 | RF-06 | Como ADMIN, quiero registrar los vehículos con placa y capacidad  | Placa única; capacidad > 0; estado `AVAILABLE/MAINTENANCE/INACTIVE`; se crea `resource` + `vehicle` en una transacción | TERMINADO |
| HU-06 | RF-07 | Como ADMIN, quiero registrar conductores con su licencia          | Vinculado a un usuario `DRIVER`; vencimiento de licencia obligatorio                                                   | TERMINADO |
| HU-07 | RF-08 | Como ADMIN, quiero bloquear un vehículo por mantenimiento         | Bloqueo con rango y motivo; no se permite si choca con una asignación activa (409 indicando cuál)                      | TERMINADO |
| HU-08 | RF-09 | Como técnico, quiero ver qué vehículos están libres en un horario | Excluye ocupados, bloqueados, inactivos y sin capacidad; muestra la ocupación del día                                  | TERMINADO |

## Sprint 3 — Solicitudes y aprobación (núcleo)

| HU    | RF           | Historia                                                              | Criterios de aceptación                                                                                         | Estado    |
| ----- | ------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------- |
| HU-09 | RF-10        | Como técnico, quiero solicitar un vehículo para una actividad         | Proyecto activo, destino, propósito, pasajeros, rango futuro válido; queda `PENDING`; notifica a ADMIN          | TERMINADO |
| HU-10 | RF-11        | Como técnico, quiero cancelar mi solicitud                            | Solo el dueño o ADMIN; no si el viaje inició; libera la asignación                                              | TERMINADO |
| HU-11 | RF-12, RF-14 | Como ADMIN, quiero aprobar asignando vehículo y conductor sin choques | Conductor propuesto por defecto (HU-26), cambiable con aviso; dos aprobaciones concurrentes → una OK y otra 409 | PENDIENTE |
| HU-12 | RF-13        | Como ADMIN, quiero rechazar con motivo                                | Motivo obligatorio; notifica al solicitante                                                                     | PENDIENTE |
| HU-13 | RF-15        | Como ADMIN, quiero reasignar vehículo o conductor                     | Desactiva la asignación previa y crea otra en una transacción; notifica                                         | PENDIENTE |
| HU-14 | RF-16        | Como ADMIN, quiero ver el calendario de la flota                      | Filas = vehículos; vista día/semana; colores por estado; bloqueos visibles                                      | PENDIENTE |
| HU-15 | RF-17        | Como ADMIN, quiero saber quién aprobó o rechazó cada solicitud        | Registro en `audit_log` con usuario, acción y fecha                                                             | PENDIENTE |
| HU-26 | RF-07, RF-10 | Como técnico, quiero indicar quién conduce al solicitar               | Perfil de conductor para cualquier usuario; "yo" por defecto; licencia vigente a la fecha (RN-15)               | PENDIENTE |

## Sprint 4 — App móvil del solicitante

| HU    | RF           | Historia                                                              | Criterios de aceptación                                                  | Estado    |
| ----- | ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------- |
| HU-16 | RF-18        | Como técnico, quiero iniciar sesión en la app                         | Token en `expo-secure-store`; sesión persiste; logout limpia             | PENDIENTE |
| HU-17 | RF-18, RF-09 | Como técnico, quiero solicitar desde el celular viendo disponibilidad | Formulario con fecha/hora; indicador de vehículos libres antes de enviar | PENDIENTE |
| HU-18 | RF-18        | Como técnico, quiero ver y cancelar mis solicitudes                   | Lista por estado; detalle con vehículo y conductor asignado              | PENDIENTE |
| HU-19 | RF-19, RF-20 | Como técnico, quiero recibir notificaciones                           | Push al aprobar/rechazar/reasignar; bandeja in-app con leídas/no leídas  | PENDIENTE |

## Sprint 5 — Bitácora y reportes

| HU    | RF           | Historia                                                   | Criterios de aceptación                                                                | Estado    |
| ----- | ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------- |
| HU-20 | RF-21        | Como conductor, quiero ver mis viajes de hoy y próximos    | Solo asignaciones activas propias, tenga el rol que tenga (RN-16)                      | PENDIENTE |
| HU-21 | RF-22, RF-23 | Como conductor, quiero registrar salida y llegada          | km llegada ≥ km salida; actualiza km del vehículo; solicitud → `COMPLETED`             | PENDIENTE |
| HU-22 | RF-24, RF-25 | Como ADMIN, quiero reportes de uso por proyecto y vehículo | Filtro por rango; km, horas, viajes, cancelaciones; exporta CSV                        | PENDIENTE |
| HU-23 | RF-26        | Como ADMIN, quiero un dashboard                            | Pendientes, viajes de hoy, vehículos en mantenimiento, licencias que vencen en 30 días | PENDIENTE |

## Sprint 6 — Despliegue y UAT

| HU    | Historia                                                                   | Estado    |
| ----- | -------------------------------------------------------------------------- | --------- |
| HU-24 | Como fundación, quiero el sistema desplegado y la app instalable (APK/EAS) | PENDIENTE |
| HU-25 | Como fundación, quiero validar el sistema con usuarios reales (UAT)        | PENDIENTE |

## Fase 2 (fuera del MVP)

- Otros medios: nuevo `resource.type = 'EQUIPMENT'` + tabla `equipment`; una solicitud
  podrá llevar varias asignaciones (vehículo + proyector, por ejemplo).
