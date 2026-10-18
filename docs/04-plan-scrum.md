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
- El backlog de producto vive en `03-backlog-del-producto.md`; el estado general en
  `00-estado-del-proyecto.md`.

### 2.1 Gestión de tareas en GitHub

El trabajo del día a día se gestiona en GitHub; `docs/03` sigue siendo la referencia de
producto (qué y por qué), los issues son la unidad de trabajo (quién y cuándo).

| Elemento                 | Uso                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Issue**                | Una historia (`HU-XX: …`), un error o una tarea técnica, con su plantilla                                                      |
| **Etiquetas**            | `tipo:` (historia, bug, tarea, deuda, seguridad) · `área:` (api, web, móvil, infra, docs) · `prioridad:` (must, should, could) |
| **Milestone**            | Un sprint (`Sprint 3`…), con su fecha de cierre                                                                                |
| **Project "Medios AeA"** | Tablero: Backlog → Sprint → En curso → En revisión → Hecho                                                                     |
| **PR**                   | Una rama por issue; `Closes #N` en la descripción cierra el issue al mergear                                                   |

Ritual del sprint:

1. **Planificación:** se mueven al milestone del sprint los issues que caben, empezando
   por los `prioridad:must`; cada uno con criterios de aceptación claros.
2. **Durante el sprint:** el tablero refleja el estado real (un issue "En curso" por
   persona a la vez).
3. **Revisión:** demo de lo que está en "Hecho"; lo no terminado vuelve a Backlog o pasa
   al siguiente milestone, nunca queda a medias en `develop`.
4. **Cierre:** `develop → main`, PR de release (`docs/05` §1.1) y actualización de
   `docs/00`, `docs/03` y `docs/09`.

Los errores encontrados en revisión o UAT se registran como issue `tipo:bug` antes de
corregirlos, para que quede constancia en el historial.

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
3. CI en verde: calidad (formato, commits, título), lint, tipos, pruebas con umbrales
   de cobertura, Docker y seguridad.
4. La documentación afectada está actualizada (esquema, backlog, matriz).
5. Tiene PR revisado según `17-revision-de-codigo.md` y _squash merge_ a `develop`, con
   su issue cerrado.

La plantilla de PR (`.github/pull_request_template.md`) repite esta lista.

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
