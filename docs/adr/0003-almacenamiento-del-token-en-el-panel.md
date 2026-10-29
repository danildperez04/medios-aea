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

## Consecuencias

- Migración `refresh_token` (usuario, familia, hash, vencimiento, uso, revocación).
- Una cuenta desactivada no puede refrescar: se revoca su familia.
- El panel deja de usar `localStorage` y borra la clave anterior al arrancar.
- Pendiente fuera de este cambio: limpiar periódicamente los refresh tokens vencidos y
  revocar las sesiones abiertas al cambiar la contraseña.
- `SECURITY.md` §5 y `docs/14-arquitectura.md` describen el nuevo flujo.
