# Changelog

Todas las versiones de Medios AeA. A partir de la `0.4.0` este archivo lo mantiene
release-please con los Conventional Commits (`docs/05-versionado-commits-y-ramas.md` §1).
Las versiones `0.1.0` a `0.3.0` se reconstruyeron a mano al adoptar release-please.

## [0.4.0](https://github.com/danildperez04/medios-aea/compare/v0.3.0...v0.4.0) (2026-10-19)


### Funcionalidades

* **notifications:** store in-app notifications inside the caller's transaction ([43dd0bd](https://github.com/danildperez04/medios-aea/commit/43dd0bdbabe3a88b96ef188482c4f74daa606b1c))
* **reservations:** let requesters create pending requests and list their own ([0c8ecf2](https://github.com/danildperez04/medios-aea/commit/0c8ecf288b72cda650b54e1e7eb48fb7ec1c99a0))
* **web:** add a content security policy to the admin panel ([c081372](https://github.com/danildperez04/medios-aea/commit/c081372b987e53446f2cdaa5bae7f2046f32062d))
* **web:** add the requests inbox with a pending counter in the menu ([52246bb](https://github.com/danildperez04/medios-aea/commit/52246bb88aaa6d97a9a3d505c36b8d55672bd510))


### Correcciones

* **api:** report the real version in the health check ([9732083](https://github.com/danildperez04/medios-aea/commit/97320837756fe0e59cf86f1764667514e5ca9786))
* **api:** serve swagger only when swagger_enabled is set ([87771f4](https://github.com/danildperez04/medios-aea/commit/87771f46a73d93d2ba6b062ecb453b2ad92060f0))
* **auth:** revoke access immediately for deactivated users and role changes ([b628bbb](https://github.com/danildperez04/medios-aea/commit/b628bbbe0fea01e886f3dd3867c5e88fe3395824))
* **docker:** run the web image as an unprivileged nginx user ([0548507](https://github.com/danildperez04/medios-aea/commit/0548507cee0a76918b89ee146da184a8e966aab0))


### Documentación

* **docs:** add contributing guide and code review guide ([86af049](https://github.com/danildperez04/medios-aea/commit/86af049e921b9e32f5a201056308af82feaa443b))
* **docs:** add security policy with controls and audit exceptions ([b86ff33](https://github.com/danildperez04/medios-aea/commit/b86ff33f2cd8b3d52878829298fb93f8cede34ea))
* **docs:** document coverage policy and where commits are checked ([00d628c](https://github.com/danildperez04/medios-aea/commit/00d628c09d238d81bca256e26e8bbd2d5f25591f))
* **docs:** document the automated release flow and ghcr updates ([2855fb1](https://github.com/danildperez04/medios-aea/commit/2855fb1a1aea050a77886f65a1747e779cbbb399))
* **docs:** manage work with github issues and mark sprints 0 to 2 done ([ea21f1f](https://github.com/danildperez04/medios-aea/commit/ea21f1f4277199ced8d7838eb1fd9c7d8cc5cd05))
* **docs:** record architecture decisions as adrs ([d0f2768](https://github.com/danildperez04/medios-aea/commit/d0f276885d2027ba054e792caf9f4b1ffae9381b))
* **docs:** record hu-09 status, traceability and decisions ([c2f9f07](https://github.com/danildperez04/medios-aea/commit/c2f9f07437cacf901cf2417e4b1e55a6d8898247))
* **repo:** add issue forms for stories, bugs and technical tasks ([290210b](https://github.com/danildperez04/medios-aea/commit/290210bbabf4bcf79bd2784b8634de42d7c64a53))
* **repo:** document one-branch-per-story workflow and add pr template ([6039596](https://github.com/danildperez04/medios-aea/commit/6039596179e021345f5ab0a31a10a85dd456f0df))
* **repo:** document one-branch-per-story workflow and add pr template ([c8d128f](https://github.com/danildperez04/medios-aea/commit/c8d128f595bb3ca40e7a6577565dad036be03542))

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
