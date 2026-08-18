# Tasks: Acesso e perfil

> feature: acesso-e-perfil

## T-001 — Fundação do monorepo (Turborepo + pnpm + config compartilhada) [concluida]

- Refs: US-007
- Arquivos: package.json, pnpm-workspace.yaml, turbo.json, tsconfig.json, vitest.config.ts, prettier.config.js, docker-compose.yml, packages/config/package.json, packages/config/tsconfig.base.json, packages/config/eslint.config.js, packages/config/prettier.config.js
- Notas: Base de todas as outras tarefas. Define scripts `lint`, `typecheck`, `test`, `build`.

## T-002 — Contratos compartilhados em Zod (packages/shared) [concluida]

- Refs: AC-010, AC-011, AC-012
- Arquivos: packages/shared/package.json, packages/shared/tsconfig.json, packages/shared/src/index.ts, packages/shared/src/role.ts, packages/shared/src/profile.schema.ts, packages/shared/src/invite.schema.ts
- Notas: Fonte única de verdade — o mesmo schema valida no Fastify e no formulário do SPA.
  Limites de tamanho de bio/links moram aqui.

## T-003 — Schema Prisma, migration inicial e seed (packages/db) [concluida]

- Refs: AC-011, AC-015
- Arquivos: packages/db/package.json, packages/db/prisma.config.ts, packages/db/prisma/schema.prisma, packages/db/prisma/seed.ts, packages/db/prisma/data/cities.json, packages/db/prisma/data/institutions.json, packages/db/src/client.ts, packages/db/src/index.ts, packages/db/src/schema.test.ts
- Notas: `User`, `Account`, `Session`, `InviteCode`, `Institution`, `City`. Sem coluna de
  latitude/longitude em `User` (P-001) — a posição vem do centroide de `City`.
  `mapaVisivel` com default `false` (P-011/AC-015). Driver adapter + pooler do Neon.

## T-004 — Servidor Fastify: segurança de base, erros e /health [concluida]

- Refs: AC-018, AC-019
- Arquivos: apps/api/package.json, apps/api/src/server.ts, apps/api/src/app.ts, apps/api/src/env.ts, apps/api/src/types.ts, apps/api/src/plugins/security.ts, apps/api/src/plugins/errors.ts, apps/api/src/routes/health.ts, apps/api/src/routes/reference.ts
- Notas: helmet, CORS por lista de origens, rate limit global, cookie. Error handler que
  não vaza stack em produção. Logger com redação de campos sensíveis (P-005).

## T-005 — Better Auth com Google, LinkedIn e GitHub [concluida]

- Refs: AC-001, AC-002, AC-003
- Arquivos: apps/api/src/auth/better-auth.ts, apps/api/src/auth/session.ts, apps/api/src/auth/invite-ticket.ts, apps/api/src/auth/invite-ticket.test.ts, apps/api/src/auth/auth.gate.test.ts, apps/api/src/routes/auth.ts, apps/api/src/testing/auth.ts, apps/api/src/testing/helpers.ts, apps/api/src/testing/app.ts, apps/api/src/testing/db.ts
- Notas: Sessão em cookie httpOnly+Secure+SameSite (P-008). `accountLinking` restrito a
  provedores com e-mail verificado (ASM-006). Depende de T-003 e T-004.

## T-006 — Allowlist e convites: geração, consumo transacional e rate limit [concluida]

- Refs: AC-004, AC-005, AC-006, AC-007, AC-008, AC-017
- Arquivos: apps/api/src/modules/invite/invite.code.ts, apps/api/src/modules/invite/invite.service.ts, apps/api/src/modules/invite/invite.routes.ts, apps/api/src/modules/invite/invite.service.test.ts, apps/api/src/modules/invite/invite.routes.test.ts
- Notas: Código com 128 bits de `crypto.randomBytes`, comparação em tempo constante,
  consumo na MESMA transação que cria o usuário (P-009/AC-007). Rate limit próprio e
  agressivo na rota de resgate (AC-008). Depende de T-005.

## T-007 — Autorização com CASL [concluida]

- Refs: AC-013, AC-017
- Arquivos: apps/api/src/authz/abilities.ts, apps/api/src/authz/guard.ts, apps/api/src/authz/abilities.test.ts
- Notas: Papéis `embaixador`, `moderador`, `admin` (ASM-004). A checagem vive no servidor
  (P-004); o SPA só reusa as regras para esconder botão. Depende de T-005.

## T-008 — Perfil: serviço, rotas, sanitização e vínculo com cidade [concluida]

- Refs: AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016
- Arquivos: apps/api/src/modules/profile/profile.service.ts, apps/api/src/modules/profile/profile.routes.ts, apps/api/src/modules/profile/profile.mapper.ts, apps/api/src/modules/profile/sanitize.ts, apps/api/src/modules/profile/sanitize.test.ts, apps/api/src/modules/profile/profile.routes.test.ts
- Notas: `perfil.mapper.ts` é a única saída de perfil da API e nunca inclui e-mail (P-002).
  `sanitizar.ts` limpa bio/links antes de gravar (P-006). Depende de T-007.

## T-009 — Rota de compartilhamento com Open Graph [concluida]

- Refs: US-007
- Arquivos: apps/api/src/modules/share/share.routes.ts, apps/api/src/modules/share/share.routes.test.ts
- Notas: `/s/:tipo/:id` devolve HTML com `og:` para crawler e redireciona pessoa para o SPA
  — é o que faz link colado no WhatsApp/LinkedIn gerar prévia. Depende de T-008.

## T-010 — SPA base: Vite, React, Router, Query, Tailwind e design system [concluida]

- Refs: US-003, US-004
- Arquivos: apps/web/package.json, apps/web/vite.config.ts, apps/web/vitest.config.ts, apps/web/index.html, apps/web/src/main.tsx, apps/web/src/App.tsx, apps/web/src/styles/tokens.css, apps/web/src/lib/api.ts, apps/web/src/lib/session.ts, apps/web/src/components/ui.tsx
- Notas: Design system gerado com a skill `ui-ux-pro-max`. `api.ts` sempre com
  `credentials: 'include'` — a sessão é cookie, não header (P-008). Depende de T-002.

## T-011 — Telas: login, resgate de convite, onboarding e perfil [concluida]

- Refs: AC-009, AC-012, AC-015, AC-016
- Arquivos: apps/web/src/pages/Login.tsx, apps/web/src/pages/Invite.tsx, apps/web/src/pages/Onboarding.tsx, apps/web/src/pages/Profile.tsx, apps/web/src/components/ProtectedRoute.tsx, apps/web/src/components/Autocomplete.tsx, apps/web/src/components/BrandMarks.tsx, apps/web/src/components/ProtectedRoute.test.tsx, apps/web/src/testing/setup.ts
- Notas: `RotaProtegida` empurra para o onboarding enquanto o perfil estiver incompleto
  (AC-009). Depende de T-010.

## T-012 — Publicação: Dockerfile, Cloud Run, Firebase Hosting e CI/CD [concluida]

- Refs: AC-018
- Arquivos: apps/api/Dockerfile, apps/api/.dockerignore, firebase.json, .firebaserc, .github/workflows/ci.yml, .github/workflows/deploy-api.yml, .github/workflows/deploy-web.yml
- Notas: Cloud Run em `us-east1` (única região grátis perto do Brasil). Autenticação do CI
  por Workload Identity Federation — nenhuma chave de service account no repositório (P-007).
  Segredos no Secret Manager. Depende de T-004.

## T-013 — Documentação: AGENTS.md por pasta e README.md em português [concluida]

- Refs: US-007
- Arquivos: AGENTS.md, README.md, .env.example, apps/api/AGENTS.md, apps/web/AGENTS.md, packages/db/AGENTS.md, packages/shared/AGENTS.md, packages/config/AGENTS.md
- Notas: README em português, com aviso de projeto não oficial enquanto Q-003 estiver aberta.
  `.env.example` só com placeholder (P-007).
