# Tasks: Publicar fora do Google Cloud

> feature: infra-render-vercel-r2

## T-098 — Driver de armazenamento no Cloudflare R2 [concluída]

- Refs: US-064, AC-153, AC-154
- Arquivos: apps/api/src/modules/media/r2-storage.ts, apps/api/src/modules/media/r2-storage.test.ts, apps/api/src/app.ts
- Notas: substitui o `cloud-storage.ts`, que foi removido. A interface
  `StorageDriver` não mudou — foi ela que tornou a troca um arquivo só.

## T-099 — Contrato de ambiente e travas de produção [concluída]

- Refs: US-064, AC-151, AC-152
- Arquivos: apps/api/src/env.ts, apps/api/src/env.test.ts, .env.example
- Notas: cinco variáveis obrigatórias em produção. Aviso em README não é trava.

## T-100 — Blueprint do Render e configuração da Vercel [concluída]

- Refs: US-064
- Arquivos: render.yaml, vercel.json, apps/api/Dockerfile, .github/workflows/manter-api-acordada.yml
- Notas: a CSP foi portada do `firebase.json` sem afrouxar nada, com os dois
  marcadores de ambiente que precisam ser trocados antes do primeiro deploy.

## T-101 — Correção do build da imagem [concluída]

- Refs: US-064
- Arquivos: packages/db/prisma.config.ts
- Notas: `env('DATABASE_URL')` resolvia no carregamento e derrubava o
  `prisma generate` dentro da imagem, onde não há string de conexão. Nunca
  apareceu porque os workflows de deploy jamais rodaram.
