# 0001 — La regla anti-choque vive en PostgreSQL

- **Estado:** Aceptada
- **Fecha:** 2026-10-16
- **Decide:** Danild Pérez, con la coordinación logística

## Contexto

El problema que origina el sistema es que el mismo vehículo se comprometía para dos
actividades a la misma hora. Si la regla vive solo en el código de la API, basta un error
en un servicio o dos personas aprobando a la vez para que vuelva a pasar.

## Opciones consideradas

1. **Validar en el servicio** antes de guardar. Simple, pero tiene una ventana de carrera:
   dos aprobaciones simultáneas leen "libre" y ambas guardan.
2. **Validar en el servicio con bloqueo de fila** (`SELECT … FOR UPDATE`). Cierra la
   carrera si todo el código pasa por ese servicio; no protege de inserciones por otra vía.
3. **Restricción de exclusión** de PostgreSQL (`EXCLUDE USING gist` sobre `tstzrange`,
   con `btree_gist`). La base rechaza cualquier par de asignaciones activas solapadas,
   venga de donde venga.

## Decisión

Las tres capas: la restricción de exclusión es la garantía
(`ex_assignment_resource_overlap`, `ex_assignment_driver_overlap`); el servicio valida
antes para dar un mensaje claro, y toma `FOR UPDATE` sobre el medio para serializar
aprobaciones y bloqueos (que viven en otra tabla y no entran en la restricción).
Periodos semiabiertos `[inicio, fin)`.

## Consecuencias

- Imposible guardar un choque, aun con errores en el código (probado en PT-11).
- El error `23P01` se traduce a 409 en el filtro global.
- Cancelar o reasignar nunca borra filas: pone `active = false`.
- Atado a PostgreSQL (no portable a otros motores); aceptable para este proyecto.
