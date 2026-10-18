# Guía de Despliegue — Medios AeA

**Versión:** 1.0.0
**Fecha:** 16 de octubre de 2026

---

## 1. Resumen

El sistema se publica como **dos imágenes Docker** (`api` y `web`) más una base
PostgreSQL. Las mismas imágenes corren en dos escenarios, cambiando solo variables
de entorno:

| Escenario                            | Cuándo                     | Base de datos                |
| ------------------------------------ | -------------------------- | ---------------------------- |
| **A. Servidor de la fundación** (§3) | Si el sistema se adopta    | Contenedor PostgreSQL propio |
| **B. PaaS** — Render u otro (§4)     | Piloto sin servidor propio | PostgreSQL gestionado        |

La app móvil se distribuye como **APK** generado con EAS Build (§5).

```
 Teléfonos (APK) ──┐
                   ├──▶ :80  web (nginx) ──/api/──▶ api (NestJS) ──▶ postgres
 Navegador (panel) ┘        sirve el panel          migra al arrancar   volumen
                            único puerto expuesto   red interna        red interna
```

- **Solo `web` se expone.** Sirve el panel y reenvía `/api/` a la API. La API y la base
  no son alcanzables desde fuera.
- **La API aplica las migraciones al arrancar.** Actualizar es reconstruir y reiniciar.

### Variables de las imágenes

| Imagen | Variable                                                                      | Uso                                                          |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| api    | `DATABASE_URL`                                                                | `postgres://usuario:clave@host:5432/base`. Si existe, manda. |
| api    | `DATABASE_HOST/PORT/NAME/USER/PASSWORD`                                       | Alternativa a la URL (la usa Docker Compose)                 |
| api    | `JWT_SECRET`                                                                  | **Obligatoria**, ≥ 32 caracteres. `openssl rand -hex 32`     |
| api    | `PORT`                                                                        | Puerto interno (3000 por defecto; los PaaS lo imponen)       |
| api    | `CORS_ORIGIN`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`, `LOG_LEVEL`, `DATABASE_SSL` | Ver `.env.production.example`                                |
| web    | `PORT`                                                                        | Puerto de nginx (8080 por defecto: corre sin privilegios)    |
| web    | `API_UPSTREAM`                                                                | Dónde está la API (`http://api:3000` por defecto)            |

## 2. Requisitos

- Servidor Linux con Docker Engine 24+ y el plugin Compose (`docker compose version`).
- **2 vCPU, 2 GB de RAM, 20 GB de disco** bastan para la fundación (decenas de usuarios).
  Construir las imágenes necesita **~5 GB libres** temporalmente (caché de build).
- Un puerto libre (80 por defecto) accesible desde la red donde están los teléfonos.

## 3. Opción A — Servidor de la fundación (Docker Compose)

### A.1 Instalar

```bash
sudo git clone <url-del-repositorio> /opt/medios-aea
cd /opt/medios-aea
cp .env.production.example .env.production
nano .env.production          # completar DATABASE_PASSWORD, JWT_SECRET, CORS_ORIGIN, WEB_PORT
```

Para generar los secretos: `openssl rand -base64 24` (contraseña de la BD) y
`openssl rand -hex 32` (JWT_SECRET).

### A.2 Levantar

```bash
pnpm prod:up       # sin pnpm: ./scripts/compose-prod.sh up -d --build
pnpm prod:ps       # los tres servicios deben quedar "healthy"
curl http://localhost/api/v1/health      # {"status":"ok","database":"connected",...}
```

### A.3 Crear el primer administrador

```bash
pnpm prod:admin    # pide nombre, correo y contraseña
```

**No ejecutar `db:seed` en producción**: carga usuarios de ejemplo con una contraseña
pública (el seeder se niega si `NODE_ENV=production`).

Abrir `http://IP-DEL-SERVIDOR` (o `:WEB_PORT`) desde un navegador de la red.

### A.4 Actualizar a una versión nueva

```bash
cd /opt/medios-aea
./scripts/backup.sh               # siempre antes de actualizar
git pull
pnpm prod:up                      # reconstruye; la API aplica las migraciones nuevas al arrancar
pnpm prod:logs                    # verificar "Aplicada: ..." y "API escuchando"
```

### A.5 Operación

| Tarea                    | Comando                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Ver estado               | `pnpm prod:ps`                                                                            |
| Ver logs                 | `pnpm prod:logs`                                                                          |
| Detener (conserva datos) | `pnpm prod:down`                                                                          |
| Consola SQL              | `./scripts/compose-prod.sh exec postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'` |

Los datos viven en el volumen `medios_aea_prod_pgdata`. `prod:down` **no** lo borra;
`docker volume rm` sí, y no tiene vuelta atrás.

### A.6 Respaldos

```bash
./scripts/backup.sh                                   # → backups/medios_aea_<fecha>.sql.gz
./scripts/restore.sh backups/medios_aea_<fecha>.sql.gz  # pide confirmación; detiene la API mientras restaura
```

Respaldo diario a las 2:00 con cron (`crontab -e`):

```
0 2 * * * /opt/medios-aea/scripts/backup.sh >> /opt/medios-aea/backups/backup.log 2>&1
```

Se conservan 14 días (`RETENTION_DAYS`). **Copia los respaldos fuera del servidor**
(otra máquina o almacenamiento de la fundación): un respaldo en el mismo disco no
protege de que el disco falle.

### A.7 Pasar a HTTPS cuando haya dominio

Sin dominio el sistema funciona por HTTP en la red interna. Cuando exista un dominio
(p. ej. `medios.ayudaenaccion.org`) apuntando al servidor, se agrega **Caddy** delante,
que obtiene y renueva el certificado de Let's Encrypt solo:

1. En `.env.production`, `WEB_PORT=8080` y `CORS_ORIGIN=https://medios.ayudaenaccion.org`.
2. Crear `Caddyfile`:
   ```
   medios.ayudaenaccion.org {
       reverse_proxy web:8080
   }
   ```
3. Agregar el servicio al compose (o en un `docker-compose.override.yml`):
   ```yaml
   caddy:
     image: caddy:2-alpine
     restart: unless-stopped
     ports: ['80:80', '443:443']
     volumes: ['./Caddyfile:/etc/caddy/Caddyfile:ro', 'caddy_data:/data']
     networks: [internal]
   ```
4. Recompilar el APK con `EXPO_PUBLIC_API_URL=https://medios.ayudaenaccion.org/api/v1`
   (§5): con HTTPS el APK ya no permite tráfico sin cifrar.

## 4. Opción B — PaaS (Render)

Render construye las imágenes desde el repositorio y da HTTPS gratis en
`*.onrender.com`. Otros PaaS (Railway, Fly.io) se configuran igual: dos servicios Docker
y una base PostgreSQL.

1. **PostgreSQL**: _New → PostgreSQL_. Copiar la **Internal Database URL**.
2. **API**: _New → Web Service_ desde el repositorio, runtime **Docker**,
   _Dockerfile path_ `api/Dockerfile`, _Docker context_ `.` (raíz). Variables:
   - `DATABASE_URL` = la Internal Database URL
   - `JWT_SECRET` = `openssl rand -hex 32`
   - `NODE_ENV=production`
   - _Health check path_: `/api/v1/health`
3. **Web**: otro _Web Service_ Docker con `web/Dockerfile`, contexto `.`. Variables:
   - `API_UPSTREAM` = la URL interna de la API, con su puerto (Render la muestra como
     _Internal Address_, p. ej. `http://medios-aea-api:10000`)
   - `PORT` lo pone Render; la imagen lo respeta.
4. **Administrador**: desde la _Shell_ del servicio API:
   `node dist/database/scripts/create-admin.js`.
5. URL para el APK: `https://<servicio-web>.onrender.com/api/v1`.

En los planes gratuitos de Render los servicios se duermen tras inactividad (la primera
petición tarda) y la base gratuita caduca: sirve para un piloto, no para operación diaria.

## 5. App móvil (APK)

La URL de la API se fija **al compilar** (`EXPO_PUBLIC_API_URL` en `mobile/eas.json`).
Con una URL `http://` el APK permite tráfico sin cifrar (necesario sin dominio); con
`https://` no (ver `mobile/app.config.ts`).

### 5.1 Primera vez

Requiere una cuenta gratuita en https://expo.dev.

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest init          # vincula el proyecto a la cuenta (agrega el projectId)
```

### 5.2 Compilar

1. En `mobile/eas.json`, perfil `preview`, reemplazar `CAMBIAR-IP-DEL-SERVIDOR` por la IP o
   el host del servidor (con `:WEB_PORT` si no es 80). Para Render, el perfil `production`
   con la URL `https://...onrender.com/api/v1`.
2. Lanzar el build en la nube de Expo (unos 10–15 minutos):
   ```bash
   npx eas-cli@latest build -p android --profile preview
   ```
3. Al terminar, EAS da un **enlace y un QR** para descargar el APK.

### 5.3 Instalar en los teléfonos

Compartir el enlace (correo, WhatsApp). En Android: abrir el APK y permitir
_Instalar apps de origen desconocido_ para el navegador o el gestor de archivos. Para
actualizar, instalar el APK nuevo encima: la sesión y los datos se conservan.

> Si la app dice "No hay conexión con el servidor": verificar desde el navegador del
> teléfono que `http://IP-DEL-SERVIDOR/api/v1/health` responde. Si no, el teléfono no
> está en la misma red o el firewall del servidor bloquea el puerto.

## 6. Checklist de seguridad antes de abrir el sistema

- [ ] `JWT_SECRET` y `DATABASE_PASSWORD` generados al azar, distintos a los del ejemplo.
- [ ] `.env.production` **no** está en git (`git status` no lo muestra).
- [ ] Solo el puerto de `web` está abierto en el firewall; 5432 y 3000 cerrados.
- [ ] No se ejecutó `db:seed`; los usuarios se crearon con `prod:admin` y desde el panel.
- [ ] Respaldo diario programado y probado con `restore.sh` al menos una vez.
- [ ] Con dominio: HTTPS activo (§A.7) y APK recompilado con `https://`.

## 7. Verificación realizada (16 oct 2026)

En local, con el stack de producción en el puerto 8080:
migraciones aplicadas al arrancar · `/api/v1/health` OK · solo `web` publica puerto ·
API corriendo como usuario `node` · cabeceras de seguridad en todas las rutas ·
`create-admin` con entrada redirigida (y error claro si la entrada se corta) · login y alta de proyecto en
Chromium · datos conservados tras `down`/`up` · respaldo, borrado deliberado y
restauración · imagen de la API con solo `DATABASE_URL` y `PORT=10000` + web con
`PORT=10001` y `API_UPSTREAM` (simulación de PaaS) · `expo config` con y sin HTTP.

## Historial

| Versión | Fecha       | Autor        | Cambio                         |
| ------- | ----------- | ------------ | ------------------------------ |
| 1.0.0   | 16 oct 2026 | Danild Pérez | Creación inicial del documento |
