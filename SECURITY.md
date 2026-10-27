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

Configuradas en `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`). Cada excepción debe
tener motivo y fecha de revisión; si no se puede justificar, no se ignora.

| Aviso               | Paquete    | Severidad | Vía                              | Motivo                                                                      | Revisar                                    |
| ------------------- | ---------- | --------- | -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| GHSA-86w9-cpqp-85rv | node-forge | Alta      | Herramientas de Expo (app móvil) | Sin versión corregida; se usa al compilar el APK, no en la app ni en la API | Al actualizar el SDK de Expo, o 18/01/2027 |
| GHSA-vfj7-8cjw-p6xm | braces     | Alta      | Herramientas de Expo (app móvil) | Sin versión corregida; solo en la compilación del bundle                    | Al actualizar el SDK de Expo, o 18/01/2027 |
| GHSA-mrhx-c7xc-m3w5 | zod 3      | Alta      | `@expo/cli` (app móvil)          | Parche solo para zod 4; la CLI pide `^3.25.76` y valida configuración local | Al actualizar el SDK de Expo, o 27/01/2027 |

Además queda un aviso moderado que no bloquea (`--audit-level high`) y no se ignora para
que siga visible: `decode-uri-component` 0.2.2 (GHSA-vcc3-ghjq-m6fr), que entra en la app
por `expo-router` → `query-string` 7. La corrección (0.5) es solo ESM y rompe
`query-string`; el riesgo es que un enlace mal formado congele la app de quien lo abre,
no la API. Se revisa al actualizar el SDK de Expo. `uuid` desapareció el 27/10/2026
(`xcode` 4 ya no lo usa).

## 5. Medidas en la aplicación

- Contraseñas con bcrypt (12 rondas); política de 8+ caracteres con mayúscula,
  minúscula y número.
- JWT firmado con `JWT_SECRET` de 32+ caracteres (la API no arranca sin él).
- Límite de intentos de inicio de sesión (10 por minuto e IP) y límite global.
- `helmet` en la API; CORS restringido a la web.
- Panel con Content-Security-Policy (`web/nginx/security-headers.conf`): solo scripts y
  conexiones del propio origen, sin `<object>`, sin ser embebido en otros sitios.
  Verificada navegando el panel completo sin violaciones.
- Validación estricta de entrada (`whitelist` + `forbidNonWhitelisted`): campos no
  declarados se rechazan.
- El rol se valida en el servidor en cada endpoint.
- Contenedores sin root: la API corre como `node` y el panel como `nginx` (uid 101).
- Solo el contenedor web publica un puerto; la API y PostgreSQL quedan en la red interna.

Decisiones abiertas: el almacenamiento del token en el panel web (ADR 0003).

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
