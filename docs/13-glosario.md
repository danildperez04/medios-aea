# Glosario — Medios AeA

| Término                  | Definición                                                                                             | En el código             |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------ |
| Medio / Recurso          | Cualquier bien que se presta para una actividad. En el MVP solo vehículos.                             | `resource`               |
| Vehículo                 | Recurso de tipo `VEHICLE` con placa, capacidad y odómetro.                                             | `vehicle`                |
| Conductor                | Usuario con rol `DRIVER` y licencia vigente.                                                           | `driver`                 |
| Solicitud                | Petición de un técnico para usar un vehículo en un horario, para un proyecto.                          | `reservation_request`    |
| Asignación               | Vínculo aprobado entre una solicitud, un recurso y (opcional) un conductor. Es lo que ocupa la agenda. | `reservation_assignment` |
| Choque / Solape          | Dos asignaciones activas del mismo vehículo o conductor cuyos periodos se cruzan.                      | `period && period`       |
| Periodo semiabierto      | Rango `[inicio, fin)`: incluye el inicio, excluye el fin.                                              | `tstzrange(a, b, '[)')`  |
| Bloqueo                  | Periodo en que un vehículo no se puede usar (taller, uso administrativo).                              | `blackout`               |
| Bitácora de viaje        | Registro del conductor: hora, km y combustible de salida y de llegada.                                 | `trip_log`               |
| Odómetro                 | Kilometraje acumulado del vehículo.                                                                    | `current_odometer`       |
| Coordinación logística   | Personal que administra la flota y aprueba solicitudes.                                                | rol `ADMIN`              |
| Técnico/a de proyecto    | Personal que ejecuta actividades en campo y solicita vehículo.                                         | rol `REQUESTER`          |
| Restricción de exclusión | Regla de PostgreSQL que impide guardar dos filas que cumplan una condición entre sí (aquí: solaparse). | `EXCLUDE USING gist`     |
