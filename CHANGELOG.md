# Changelog

Todas las versiones de Medios AeA. A partir de la `0.4.0` este archivo lo mantiene
release-please con los Conventional Commits (`docs/05-versionado-commits-y-ramas.md` §1).
Las versiones `0.1.0` a `0.3.0` se reconstruyeron a mano al adoptar release-please.

## [0.3.0](https://github.com/danildperez04/medios-aea/compare/v0.2.0...v0.3.0) (2026-10-18)

Sprint 2 — flota y disponibilidad, más despliegue, refactor de DTO y sistema de diseño.

### Funcionalidades

- **vehicles:** gestión de vehículos sobre el modelo genérico de medios, con mantenimiento y baja.
- **drivers:** conductores con licencia y estado de vencimiento (vigente, por vencer, vencida).
- **blackouts:** bloqueos de cualquier medio; rechaza los que chocan con viajes aprobados.
- **availability:** disponibilidad de medios y conductores con el motivo de cada no disponible; agenda.
- **web:** agenda real en "Hoy", pantallas de vehículos y conductores, aviso de licencias.
- **web:** sistema de diseño con la marca de Ayuda en Acción (paleta, tipografía, agenda).
- **mobile:** fuentes y colores de marca en el inicio de sesión y la pantalla de inicio.
- **api:** acepta `DATABASE_URL` para ejecutarse en un PaaS.
- Imágenes Docker portables, `docker-compose.prod.yml`, respaldos y perfiles de APK con EAS.

### Correcciones

- **db:** `create-admin` funciona con la entrada redirigida en vez de terminar sin crear a nadie.
- **web:** la agenda ubica bien los bloques de varios días; una etiqueta oculta ya no desborda la página.
- **web:** dejó de pedir una fuente inexistente en cada carga.
- **api:** enviar `null` en un campo obligatorio responde 400 en lugar de 500.

### Cambios internos

- **api:** DTO separados por archivo y derivados con mapped types de NestJS.

## [0.2.0](https://github.com/danildperez04/medios-aea/compare/v0.1.0...v0.2.0) (2026-10-16)

Sprint 1 — acceso y catálogos base.

### Funcionalidades

- **users:** gestión de usuarios por la coordinación, con protección para no quedarse sin administradores.
- **projects:** catálogo de proyectos; solo los activos son visibles para técnicos y conductores.
- **web:** pantallas de usuarios y proyectos y cambio de contraseña.
- **db:** seeder idempotente de datos de ejemplo y script interactivo `create-admin`.

### Correcciones

- **auth:** una contraseña actual incorrecta responde 400 y ya no cierra la sesión.

## [0.1.0](https://github.com/danildperez04/medios-aea/releases/tag/v0.1.0) (2026-10-16)

Sprint 0 — documentación y andamiaje.

### Funcionalidades

- Monorepo con API (NestJS), panel web (React) y app móvil (Expo).
- Esquema completo de la base con las restricciones que impiden asignar dos veces un
  vehículo o un conductor en el mismo horario.
- Inicio de sesión con roles en la API, el panel y la app.
