# 0003 — Dónde guarda el panel web el token de sesión

- **Estado:** Propuesta
- **Fecha:** 2026-10-18
- **Decide:** pendiente, antes de la UAT (Sprint 6)

## Contexto

El panel guarda el JWT en `localStorage` (con zustand `persist`) para que recargar no
cierre la sesión. Cualquier script que logre ejecutarse en la página (un XSS, una
dependencia comprometida) puede leerlo y usarlo desde otro equipo hasta que venza (8 h).

Mitigaciones presentes: React escapa el contenido por defecto y el código no usa
`dangerouslySetInnerHTML`. La revisión de seguridad del 18/10/2026 agrega una
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

## Propuesta

Opción 2 antes de la UAT: cierra el riesgo principal con un cambio acotado, y la
arquitectura (web y API en el mismo origen) ya la favorece.

## Consecuencias si se acepta

- Issue `tipo:seguridad` con el cambio en API y web y sus pruebas (login, logout, CSRF,
  convivencia con el encabezado `Authorization` de la app).
- `SECURITY.md` §5 se actualiza.
