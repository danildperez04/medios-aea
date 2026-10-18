# syntax=docker/dockerfile:1
# Imagen de la API. Contexto de build: la raíz del monorepo.
#   docker build -f api/Dockerfile -t medios-aea-api .

# ---------- Build ----------
FROM node:26-alpine AS build
WORKDIR /repo
RUN corepack enable
# Primero solo los manifiestos: la capa de dependencias se reutiliza mientras no cambien.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/
RUN pnpm install --frozen-lockfile --filter @medios-aea/api...
COPY api ./api
RUN pnpm --filter @medios-aea/api build
# Carpeta autónoma con dist, package.json (sus "imports" resuelven #config/* → dist)
# y solo las dependencias de producción.
RUN pnpm --filter @medios-aea/api deploy --prod --legacy /out \
 && cp -r api/dist /out/dist

# ---------- Producción ----------
FROM node:26-alpine AS production
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
# Solo lo que se ejecuta: ni código fuente, ni pruebas, ni configuración de desarrollo.
COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
# Aplica las migraciones pendientes antes de servir: una versión nueva nunca
# arranca contra un esquema viejo.
CMD ["sh", "-c", "node dist/database/run-migrations.js && exec node dist/main.js"]
