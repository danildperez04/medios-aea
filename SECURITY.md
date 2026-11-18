# Seguridad — Medios AeA

## 1. Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:
_Security → Report a vulnerability_ en el repositorio (o escribe a la persona
responsable del proyecto). Incluye qué encontraste, cómo reproducirlo y el impacto.

Respuesta inicial en un máximo de 5 días hábiles. Se avisa cuando haya una versión
corregida.

## 2. Versiones con soporte

Solo la última versión publicada (`main`) recibe correcciones de seguridad. Antes de
la `1.0.0` el sistema está en piloto y no hay versiones paralelas.

## 3. Controles automáticos

| Control                                             | Herramienta                 | Dónde                    | Bloquea el merge                      |
| --------------------------------------------------- | --------------------------- | ------------------------ | ------------------------------------- |
| Secretos en todo el historial                       | gitleaks (`.gitleaks.toml`) | `security.yml`           | Sí                                    |
| Dependencias vulnerables (producción, alta/crítica) | `pnpm audit`                | `security.yml`           | Sí                                    |
| Dockerfiles y configuración insegura                | Trivy `config`              | `security.yml`           | Sí                                    |
| Análisis estático del código                        | CodeQL `security-extended`  | `codeql.yml`             | Las alertas quedan en _Code scanning_ |
| Dependencias, acciones e imágenes base al día       | Dependabot                  | `.github/dependabot.yml` | — (abre PR)                           |

Los controles de `security.yml` corren en cada PR, en cada push a `develop`/`main` y
todos los lunes.

## 4. Excepciones vigentes de auditoría

**Ninguna** desde el 18/11/2026. Si hiciera falta una, se configura en
`pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`) y se anota aquí con su motivo y su
fecha de revisión; si no se puede justificar, no se ignora.

Las cuatro que hubo se quitaron con la actualización a Expo SDK 58 (#73):

| Aviso               | Paquete              | Por qué ya no hace falta                                     |
| ------------------- | -------------------- | ------------------------------------------------------------ |
| GHSA-qr28-fpjm-wq7f | decode-uri-component | `expo-router` 58 ya no usa `query-string`: el paquete se fue |
| GHSA-mrhx-c7xc-m3w5 | zod 3                | Solo queda zod 4.6.7, fuera del rango afectado               |
| GHSA-vfj7-8cjw-p6xm | braces               | GitHub retiró el aviso el 23/10/2026                         |
| GHSA-fc5q-39xc-vjpf | picomatch            | GitHub retiró el aviso el 18/11/2026                         |

Quedan visibles, sin bloquear (`--audit-level high`), avisos moderados y bajos de las
herramientas de compilación de la app móvil: `node-forge` (cuatro), `glob` y `minimatch`.
No llegan a la API ni al panel. Se revisan en #32.

## 5. Medidas en la aplicación

- Contraseñas con bcrypt (12 rondas); política de 8+ caracteres con mayúscula,
  minúscula y número.
- JWT firmado con `JWT_SECRET` de 32+ caracteres (la API no arranca sin él).
- Sesión del panel web (ADR 0003): token de acceso de 15 min **solo en memoria** (nada en
  `localStorage`) y refresh token opaco en una cookie `HttpOnly`, `SameSite=Strict`,
  limitada a `/api/v1/auth/session` y `Secure` con HTTPS. La base guarda solo su SHA-256;
  rota en cada uso, vence a las 12 h sin uso y, si vuelve un token ya rotado, se revoca
  toda la sesión. Refrescar y salir exigen el encabezado `X-Medios-Client` (CSRF). Solo
  la coordinación abre sesión en el panel.
- Sesión de la app móvil (HU-28): el mismo mecanismo, con los dos tokens en SecureStore
  (Keychain o Keystore) y el refresh token en el cuerpo de la petición. Vence a los 7
  días sin uso y un token solo sirve en las rutas de su cliente (panel o app).
- Cambiar o restablecer una contraseña cierra todas las sesiones de la persona: revoca
  sus refresh tokens y deja sin efecto, en la siguiente petición, los tokens de acceso
  ya emitidos (`session_version`).
- Avisos push (HU-19): cada persona solo lee y marca sus avisos (lo ajeno responde 404) y
  solo quita sus teléfonos. Un aviso muestra destino y horario en la pantalla bloqueada;
  por eso cerrar sesión en la app, cerrar las sesiones desde el panel o cambiar la
  contraseña olvidan los teléfonos de la persona. La API solo acepta tokens con el
  formato de Expo y solo los envía a `https://exp.host`.
- La coordinación puede cerrar las sesiones de una persona sin desactivar su cuenta
  (HU-29), por ejemplo si pierde el teléfono; queda en `audit_log` quién lo hizo.
- Límite de intentos de inicio de sesión (10 por minuto e IP) y límite global. La IP es
  la de quien hace la petición, no la del proxy (`TRUST_PROXY_HOPS`, `docs/11` §1).
- `helmet` en la API; CORS restringido a la web.
- Panel con Content-Security-Policy (`web/nginx/security-headers.conf`): solo scripts y
  conexiones del propio origen, sin `<object>`, sin ser embebido en otros sitios.
  Verificada navegando el panel completo sin violaciones.
- Validación estricta de entrada (`whitelist` + `forbidNonWhitelisted`): campos no
  declarados se rechazan.
- El rol se valida en el servidor en cada endpoint.
- Contenedores sin root: la API corre como `node` y el panel como `nginx` (uid 101).
- Solo el contenedor web publica un puerto; la API y PostgreSQL quedan en la red interna.

Pendiente: limpiar los refresh tokens vencidos (ADR 0003, consecuencias).

## 6. Manejo de secretos

- Nunca en el repositorio: `.env`, `.env.production` y `.env.*.local` están en
  `.gitignore`; gitleaks lo vigila en CI.
- `JWT_SECRET`: `openssl rand -hex 32`. `DATABASE_PASSWORD`: `openssl rand -base64 24`.
- Si un secreto se filtra: **rotarlo primero** (un secreto en el historial de git sigue
  siendo público aunque se borre el archivo), luego limpiar el historial si hace falta.
- `RELEASE_PLEASE_TOKEN` (secreto de Actions): token de alcance mínimo, solo este
  repositorio y solo Contents / Pull requests / Issues; con vencimiento.
- El seeder carga usuarios de ejemplo con una contraseña pública y se niega a correr
  con `NODE_ENV=production`.
