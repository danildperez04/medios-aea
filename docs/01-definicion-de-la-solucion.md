# Definición de la Solución — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026
**Autor:** Danild Pérez (pasantía, Fundación Ayuda en Acción)

---

## 1. Resumen Ejecutivo

**Medios AeA** es un sistema para gestionar los medios de transporte de la Fundación
Ayuda en Acción. Permite que el personal técnico solicite un vehículo desde el
celular para trasladarse a las actividades de los proyectos, que la coordinación
logística apruebe y asigne vehículo y conductor desde un panel web, y que el
conductor registre cada viaje (kilometraje y combustible).

La regla central del sistema es simple: **un vehículo o un conductor no puede quedar
asignado a dos actividades que se crucen en el tiempo.** La base de datos lo impide
aunque dos personas aprueben al mismo tiempo.

El modelo se diseña sobre el concepto genérico de **recurso**, de modo que en una fase
posterior se puedan gestionar otros medios (proyectores, laptops, equipo de sonido)
sin rediseñar el sistema.

## 2. Problema

Hoy la asignación de vehículos se coordina de forma informal (mensajes, llamadas,
acuerdos de palabra). Como consecuencia:

- **Dobles asignaciones.** El mismo vehículo se compromete para dos actividades a la
  misma hora y una de ellas se cancela, a veces con la comunidad ya convocada.
- **No hay visibilidad.** Quien necesita un vehículo no sabe cuáles están libres ni
  cuándo; tiene que preguntar.
- **No hay trazabilidad.** No queda registro de quién autorizó un viaje, a qué
  proyecto se cargó, ni cuántos kilómetros o cuánto combustible consumió.
- **El mantenimiento choca con la operación.** Un vehículo puede estar en taller y
  aun así comprometerse para una actividad.

### 2.1 Causas raíz

| #   | Causa                                               | Impacto                                        |
| --- | --------------------------------------------------- | ---------------------------------------------- |
| 1   | No existe una agenda única y compartida de la flota | Dobles asignaciones y cancelaciones            |
| 2   | La aprobación no deja registro                      | No se sabe quién autorizó ni por qué           |
| 3   | No se registran los viajes                          | Sin datos de uso por proyecto ni por unidad    |
| 4   | Los conductores no se agendan junto al vehículo     | Vehículo libre pero sin conductor (o al revés) |

## 3. Objetivos

### 3.1 Objetivo general

Proporcionar una plataforma (app móvil + panel web) que centralice la solicitud,
aprobación, asignación y registro de uso de los vehículos de la fundación, eliminando
las dobles asignaciones.

### 3.2 Objetivos específicos

| #    | Objetivo                                         | Indicador de éxito                                              |
| ---- | ------------------------------------------------ | --------------------------------------------------------------- |
| OE-1 | Eliminar las dobles asignaciones                 | 0 asignaciones aprobadas solapadas (garantizado por la BD)      |
| OE-2 | Dar visibilidad de disponibilidad al solicitante | El técnico ve vehículos libres antes de enviar su solicitud     |
| OE-3 | Formalizar la aprobación                         | 100% de los viajes con aprobador, fecha y motivo de rechazo     |
| OE-4 | Registrar el uso de la flota                     | 100% de los viajes con km y combustible de salida y llegada     |
| OE-5 | Informar el uso por proyecto y por vehículo      | Reporte mensual de km, horas y viajes exportable a CSV          |
| OE-6 | Notificar a tiempo                               | El solicitante recibe aprobación/rechazo como notificación push |

### 3.3 Fuera de objetivo en el MVP

- Gestión de otros medios (proyectores, laptops, sonido). **Previsto en fase 2**; el
  modelo de datos ya lo contempla.
- Rastreo GPS en tiempo real de los vehículos.
- Control contable de gastos de combustible y mantenimiento (solo se registran
  cantidades, no costos).
- Integración con sistemas internos de la fundación (nómina, contabilidad).
- Funcionamiento totalmente offline de la app móvil.

## 4. Actores

| Actor                  | Rol en el sistema | Aplicación principal | Necesidad                                                     |
| ---------------------- | ----------------- | -------------------- | ------------------------------------------------------------- |
| Técnico/a de proyecto  | `REQUESTER`       | App móvil            | Pedir un vehículo y saber pronto si lo tiene                  |
| Conductor/a            | `DRIVER`          | App móvil            | Saber qué viajes tiene y registrar salida y llegada           |
| Coordinación logística | `ADMIN`           | Panel web            | Ver toda la agenda, aprobar sin choques, administrar la flota |

## 5. Alcance del MVP

1. Autenticación con roles (`ADMIN`, `REQUESTER`, `DRIVER`).
2. Catálogos: proyectos, vehículos, conductores, usuarios.
3. Bloqueos de vehículos (mantenimiento, uso administrativo).
4. Consulta de disponibilidad por rango de fechas y nº de pasajeros.
5. Solicitud de vehículo desde la app móvil.
6. Bandeja de aprobación en web: aprobar asignando vehículo y conductor, rechazar
   con motivo, reasignar.
7. **Prevención de choques** de vehículo y de conductor en base de datos.
8. Calendario de la flota en web.
9. Notificaciones in-app y push.
10. Bitácora de viaje del conductor (km y combustible).
11. Reportes de uso por proyecto y por vehículo, exportables a CSV.

## 6. Flujo principal

```
Técnico (móvil)            Sistema                       Coordinación (web)        Conductor (móvil)
     │ consulta disponibilidad ─▶ muestra libres
     │ envía solicitud ─────────▶ PENDING ─────────────▶ ve en bandeja
     │                            valida choques ◀────── aprueba (vehículo+conductor)
     │ ◀── push "aprobada" ────── APPROVED ───────────────────────────────────────▶ ve viaje
     │                                                                              registra salida
     │                                                                              registra llegada
     │                            COMPLETED + bitácora ─▶ reportes
```

## 7. Arquitectura en una línea

Monorepo con API REST (NestJS + PostgreSQL), panel web (React + Vite) y app móvil
(Expo). Detalle en `14-arquitectura.md`.

## 8. Riesgos

| Riesgo                                         | Mitigación                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Baja adopción (se sigue pidiendo por WhatsApp) | App simple, solicitud en ≤ 1 minuto; la coordinación solo aprueba en el sistema |
| Mala conectividad en campo                     | El conductor puede registrar el viaje al regresar; la app reintenta envíos      |
| Datos de la flota incompletos al iniciar       | Carga inicial asistida (seed) con la coordinación                               |
| Cambio de prioridades (viaje urgente)          | Reasignación por el ADMIN con notificación al afectado                          |

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
