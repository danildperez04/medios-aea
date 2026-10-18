# 0002 — Monorepo pnpm e imágenes Docker portables

- **Estado:** Aceptada
- **Fecha:** 2026-10-16
- **Decide:** Danild Pérez

## Contexto

Tres aplicaciones (API, panel, app móvil) que comparten tipos de dominio, reglas y
versión. El destino de despliegue no está decidido: un servidor de la fundación si el
sistema se adopta, o un PaaS para el piloto.

## Opciones consideradas

1. **Repositorios separados**: versiones y CI independientes, pero cada cambio de
   contrato toca tres repos y tres PR.
2. **Monorepo pnpm** con workspaces: un PR por historia aunque toque API y web; una
   versión común.
3. Para el despliegue: imágenes distintas por destino, o **las mismas imágenes**
   configuradas por variables de entorno (`DATABASE_URL`, `PORT`, `API_UPSTREAM`).

## Decisión

Monorepo pnpm con `api`, `web` y `mobile`, una versión compartida (release-please) e
imágenes portables publicadas en GHCR en cada release.

## Consecuencias

- Cambiar de servidor propio a PaaS (o al revés) es cambiar variables, no código.
- El servidor descarga imágenes ya escaneadas en vez de compilar (~5 GB de disco).
- La app móvil comparte el monorepo pero se distribuye aparte (APK con EAS).
