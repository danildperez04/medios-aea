# Plan Scrum — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026

---

## 1. Roles

| Rol Scrum                           | Persona                                                         |
| ----------------------------------- | --------------------------------------------------------------- |
| Product Owner                       | Coordinación logística / tutor de pasantía                      |
| Scrum Master y equipo de desarrollo | Danild Pérez (pasante)                                          |
| Usuarios clave                      | 2 técnicos de proyecto y 1 conductor (validan en cada revisión) |

## 2. Cadencia

- Sprints de **2 semanas**.
- Planificación al inicio, revisión con la coordinación al final (demo en el celular
  y en el panel), retrospectiva breve.
- El backlog vive en `03-backlog-del-producto.md`; el estado general en
  `00-estado-del-proyecto.md`.

## 3. Calendario

| Sprint | Fechas (aprox.)      | Objetivo                                          | Versión |
| ------ | -------------------- | ------------------------------------------------- | ------- |
| S0     | 16 oct – 29 oct 2026 | Documentación y andamiaje                         | `0.1.0` |
| S1     | 30 oct – 12 nov 2026 | Acceso, usuarios y proyectos                      | `0.2.0` |
| S2     | 13 nov – 26 nov 2026 | Flota, conductores, bloqueos, disponibilidad      | `0.3.0` |
| S3     | 27 nov – 10 dic 2026 | Solicitudes y aprobación sin choques + calendario | `0.4.0` |
| S4     | 11 dic – 24 dic 2026 | App móvil del solicitante + notificaciones        | `0.5.0` |
| S5     | 8 ene – 21 ene 2027  | Bitácora del conductor + reportes + dashboard     | `0.6.0` |
| S6     | 22 ene – 4 feb 2027  | Despliegue, APK y UAT                             | `1.0.0` |

El **MVP demostrable** a la fundación es S0–S4 (`0.5.0`).

## 4. Definition of Done

Una historia está `TERMINADO` cuando:

1. Cumple todos sus criterios de aceptación.
2. Tiene pruebas (unitarias para reglas de negocio, e2e para endpoints).
3. `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan en los workspaces afectados.
4. La documentación afectada está actualizada (esquema, backlog, matriz).
5. Tiene PR revisado y merge a `develop`.

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
