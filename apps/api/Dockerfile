# syntax=docker/dockerfile:1
#
# Imagem da API para o Cloud Run.
#
# Multi-estágio por dois motivos: a imagem final não carrega compilador,
# dependências de desenvolvimento nem código-fonte TypeScript (menos superfície
# e menos coisa para auditar), e o cache de camadas do Docker faz um deploy que
# só mudou código pular a reinstalação de dependências.

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo

# --- Dependências: camada que só invalida quando os manifestos mudam ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @connect-gsa/api...

# --- Compilação ---
FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.json ./
RUN pnpm --filter @connect-gsa/db run generate \
 && pnpm --filter @connect-gsa/shared run build \
 && pnpm --filter @connect-gsa/db exec tsc -b \
 && pnpm --filter @connect-gsa/api exec tsc -b
# Extrai só o necessário para rodar, com dependências de produção.
RUN pnpm deploy --filter @connect-gsa/api --prod --legacy /app

# --- Imagem final ---
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
# Usuário sem privilégios: se algo escapar do processo, escapa sem poder root.
USER node
# O Cloud Run injeta PORT; 8080 é o padrão dele.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.js"]
