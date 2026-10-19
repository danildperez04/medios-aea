# 0004 — El personal técnico conduce: perfil de conductor separado del rol

- **Estado:** Aceptada
- **Fecha:** 2026-10-19
- **Decide:** responsable del proyecto, según la operación actual de la fundación

## Contexto

El diseño inicial supuso choferes de planta: un usuario con rol `DRIVER`, que solo
conduce, y técnicos (`REQUESTER`) que solo piden. En la fundación no es así: **casi
siempre conduce el mismo personal técnico** o alguien del equipo, y hoy no hay choferes
de planta.

Con el modelo actual un técnico no puede ser conductor:

- cada usuario tiene un solo rol, y registrar una licencia exige el rol `DRIVER`
  (`DriversService.create`);
- un `DRIVER` no puede crear solicitudes;
- aprobar "sin conductor" (`driver_id` nulo) no sirve: nadie registraría la bitácora
  (RF-22, RF-23) ni la solicitud pasaría a `COMPLETED` (RN-12).

Además, en la práctica **quien pide decide quién maneja** y la coordinación aprueba.

## Opciones consideradas

1. **Varios roles por usuario** (`REQUESTER` + `DRIVER`): cambia la autenticación, el
   token, `@Roles()` y todas las pantallas que preguntan por el rol. Mucho cambio para
   expresar algo que no es un permiso, sino una habilitación.
2. **Perfil de conductor separado del rol**: el rol sigue diciendo qué puede hacer cada
   persona; la tabla `driver` (licencia y vencimiento) dice quién está habilitado para
   manejar, y se puede agregar a cualquier usuario activo. La tabla ya existe aparte del
   usuario, así que el esquema casi no cambia.
3. **Dejarlo como está y que la coordinación elija un conductor ficticio**: rompe la
   regla anti-choque del conductor (RN-02) y la bitácora queda a nombre de otra persona.

## Decisión

Se elige la **opción 2**:

- **Conductor habilitado** = usuario activo con perfil en `driver` y licencia vigente,
  sea técnico, coordinación o chofer. El rol `DRIVER` se conserva para choferes de
  planta (solo conducen, no piden); hoy no se usa.
- **Quien solicita propone al conductor** (RN-15): él mismo (por defecto, si tiene
  perfil) u otra persona habilitada. La licencia debe cubrir la fecha del viaje (RN-09).
  La solicitud guarda ese conductor en `reservation_request.proposed_driver_id`.
- **La coordinación aprueba con ese conductor** (HU-11): elige el vehículo y valida en
  la misma transacción que el conductor no tenga otro viaje (RN-02) ni la licencia
  vencida. Si el conductor propuesto no puede, la API responde 409 y la coordinación
  rechaza con motivo (HU-12). Cambiar al conductor de una solicitud ya aprobada es una
  reasignación (HU-13) y se avisa a quien pidió y a ambos conductores.
- **La bitácora la lleva quien conduce** (RN-16): "Mis viajes" y el registro de salida
  y llegada dependen de ser el conductor asignado, no del rol.

## Consecuencias

- `DriversService.create` deja de exigir el rol `DRIVER`; el formulario de conductores
  de la web ofrece cualquier usuario activo sin perfil.
- Migración: `reservation_request.proposed_driver_id uuid` FK → `driver.id`, nula en la
  base (los medios de fase 2, como un proyector, no llevan conductor) y obligatoria en
  el servicio para `VEHICLE`.
- Endpoint de opciones para el formulario de solicitud: conductores habilitados con
  nombre y vencimiento, sin número de licencia, accesible a `REQUESTER`.
- Una solicitud pendiente sigue sin reservar al conductor (RN-07): el formulario puede
  advertir que ya tiene otro viaje, pero solo la aprobación lo ocupa.
- Los endpoints de viajes (HU-20, HU-21) admiten `REQUESTER`, `DRIVER` y `ADMIN` y
  verifican que la asignación sea del usuario.
- Nueva historia **HU-26** (Sprint 3) antes de HU-11. HU-06 ya terminada se ajusta en
  esa historia; las reglas anti-choque (ADR 0001) no cambian.
