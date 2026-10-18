# syntax=docker/dockerfile:1
# Imagen del panel web. Contexto de build: la raíz del monorepo.
#   docker build -f web/Dockerfile -t medios-aea-web .

# ---------- Build ----------
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/
RUN pnpm install --frozen-lockfile --filter @medios-aea/web...
COPY web ./web
# La web llama a la API por el mismo origen; nginx hace el proxy de /api.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @medios-aea/web build

# ---------- Producción ----------
# Variante oficial sin privilegios: corre como el usuario nginx (uid 101) y escucha en
# 8080, porque un proceso sin root no puede abrir puertos por debajo de 1024.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS production
ENV PORT=8080 \
    API_UPSTREAM=http://api:3000
# Solo se sustituyen estas dos variables: las de nginx ($uri, $host...) quedan intactas.
ENV NGINX_ENVSUBST_FILTER="^(PORT|API_UPSTREAM)$"
COPY web/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY web/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /repo/web/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT}/" || exit 1
