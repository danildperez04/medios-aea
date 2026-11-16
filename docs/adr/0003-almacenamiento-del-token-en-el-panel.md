# 0003 — Dónde guarda el panel web el token de sesión

- **Estado:** Aceptada (opción 3)
- **Fecha:** 2026-10-18 (propuesta) · 2026-10-29 (aceptada)
- **Decide:** responsable del proyecto

## Contexto

El panel guardaba el JWT en `localStorage` (con zustand `persist`) para que recargar no
cerrara la sesión. Cualquier script que lograra ejecutarse en la página (un XSS, una
dependencia comprometida) podía leerlo y usarlo desde otro equipo hasta que venciera
(8 h).

Mitigaciones presentes: React escapa el contenido por defecto y el código no usa
`dangerouslySetInnerHTML`. La revisión de seguridad del 18/10/2026 agregó una
Content-Security-Policy al panel (solo scripts del propio origen) y hace que la API
revoque al instante el acceso de una cuenta desactivada (`JwtStrategy` consulta la base
en cada petición). La app móvil no está afectada: usa SecureStore.

## Opciones consideradas

1. **Mantener `localStorage`.** Sin trabajo; el riesgo depende de que nunca haya un XSS.
2. **Cookie `HttpOnly` + `Secure` + `SameSite=Strict`** emitida por la API, con
   protección CSRF. JavaScript no puede leer el token. Requiere cambiar login/logout,
   el guard (leer de cookie además del encabezado, porque la app móvil sigue con
   `Authorization`) y servir web y API en el mismo sitio (ya es así detrás de nginx).
3. **Token de acceso en memoria + refresh token en cookie `HttpOnly`.** El más robusto y
   el que más cambia: endpoint de refresh, rotación y revocación de refresh tokens.

## Decisión

Se elige la **opción 3**. Frente a la 2, un XSS no puede llevarse nada que sirva más de
unos minutos, el guard sigue leyendo solo el encabezado `Authorization` (igual que la
app) y cerrar sesión revoca de verdad en el servidor.

- **Token de acceso** del panel: JWT de **15 minutos** (`WEB_ACCESS_TOKEN_TTL`), solo en
  memoria. Recargar la página no cierra la sesión: el panel pide uno nuevo con la cookie.
- **Refresh token:** valor aleatorio opaco (32 bytes) en la cookie `medios_aea_refresh`:
  `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth/session`, `Secure` en producción.
  La base guarda solo su **SHA-256** (`refresh_token`), nunca el valor.
- **Rotación:** cada refresh entrega un token nuevo y marca el anterior como usado. La
  sesión vence a las **12 horas sin uso** (`REFRESH_TOKEN_TTL_HOURS`).
- **Detección de robo:** si vuelve un refresh token ya usado, se revoca toda su familia
  (la sesión): alguien lo copió. Excepción: en los **30 s** siguientes a su uso se acepta
  y emite otro de la misma familia, para que dos pestañas que refrescan a la vez no se
  cierren mutuamente.
- **CSRF:** además de `SameSite=Strict`, refrescar y cerrar sesión exigen el encabezado
  `X-Medios-Client: web`, que un formulario o un enlace de otro sitio no puede enviar; el
  CORS solo admite el propio panel.
- **Endpoints** (`/auth/session`, públicos): `POST` inicia sesión, `POST /refresh` rota,
  `POST /logout` revoca la familia y borra la cookie.
- **App móvil:** sin cambios. Sigue con `POST /auth/login`, token de 8 h en SecureStore.

## Ampliación del 30/10/2026: la app móvil y el cierre de sesiones

La app quedó fuera de esta decisión porque SecureStore no sufre el riesgo de XSS, pero
su sesión tiene otros dos problemas: se corta a las 8 h, quizá a mitad de un viaje y sin
señal, y un token robado no se puede cancelar. Se decide:

- **App (HU-28):** token de acceso corto y refresh token rotativo en SecureStore, con la
  misma tabla `refresh_token`, enviado en el cuerpo de la petición porque la app no usa
  cookies. La sesión vence a los **7 días sin uso**. Sin conexión no se cierra: solo un
  rechazo real del servidor la termina.
- **Panel (HU-29):** la coordinación puede cerrar las sesiones de una persona sin
  desactivar su cuenta, por ejemplo si pierde el teléfono. Revoca sus refresh tokens; el
  token de acceso ya emitido vence solo, en 15 minutos como máximo. Queda en `audit_log`.

## Ampliación del 17/11/2026: lo que se implementó en la HU-28

- **Rutas de la app** (`/auth/mobile-session`, públicas): `POST` inicia sesión, `POST
/refresh` rota y `POST /logout` revoca. El refresh token va en el cuerpo y la app lo
  guarda en SecureStore. Entra cualquier rol: la bitácora de un viaje la registra quien
  conduce, tenga el rol que tenga (RN-16). `POST /auth/login` se mantiene, sin
  renovación, para Swagger y las herramientas.
- **Un token solo sirve en las rutas de su cliente.** `refresh_token.client` (`web` o
  `mobile`) separa las sesiones: el refresh token de la app no renueva la sesión del
  panel ni al revés.
- **Margen de reintento de la app: 2 minutos** (30 s en el panel). Con mala señal la
  respuesta de una renovación se pierde y la app reintenta con el token que ya rotó.
  Pasado el margen, un token repetido cierra la sesión.
- **Sin conexión la app no cierra la sesión.** Solo la cierra una respuesta 400, 401 o
  403 de la API a la renovación. Un error de red, un 5xx o un 429 la conservan.
- **Cambiar o restablecer una contraseña cierra todas las sesiones de la persona**,
  también la que hizo el cambio: el panel lo explica y lleva a iniciar sesión. Se
  decidió no conservar esa sesión porque el token de acceso no identifica a cuál de las
  sesiones pertenece, y pedir la contraseña nueva una vez es un costo pequeño.
- **Cierre inmediato.** `user.session_version` viaja en cada token de acceso (`ver`) y
  `JwtStrategy`, que ya consultaba al usuario en cada petición, la compara. Al subirla,
  los tokens de acceso ya emitidos se rechazan en la siguiente petición, no al vencer.
  Esto mejora lo previsto para la HU-29 (15 minutos como máximo).

- **HU-29:** `POST /users/:id/sessions/revoke` (solo ADMIN) cierra las sesiones de una
  persona sin desactivarla, con el mismo mecanismo, y deja en `audit_log` la acción
  `REVOKE_SESSIONS` con quién la hizo. En el panel es la acción "Cerrar sesiones" de
  Usuarios. El cierre es inmediato, no "en 15 minutos como máximo" como se previó el
  30/10.

## Consecuencias

- Migración `refresh_token` (usuario, familia, hash, vencimiento, uso, revocación).
- Una cuenta desactivada no puede refrescar: se revoca su familia.
- El panel deja de usar `localStorage` y borra la clave anterior al arrancar.
- Migración `AddSessionClientAndVersion`: `refresh_token.client` y
  `user.session_version`.
- Pendiente fuera de este cambio: limpiar periódicamente los refresh tokens vencidos.
- `SECURITY.md` §5 y `docs/14-arquitectura.md` describen el nuevo flujo.
