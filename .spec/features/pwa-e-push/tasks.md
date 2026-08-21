# Tasks: Aplicativo instalável e aviso por notificação

> feature: pwa-e-push

## T-102 — Manifesto e ícones [concluída]

- Refs: US-065, AC-155
- Arquivos: apps/web/public/manifest.webmanifest, apps/web/scripts/gerar-icones.mjs, apps/web/public/icons, apps/web/index.html, vercel.json
- Notas: os ícones saem do MESMO `logo.svg` — nada de um desenho paralelo que
  divirja da marca.

## T-103 — Service worker e funcionamento sem rede [concluída]

- Refs: US-065, AC-156
- Arquivos: apps/web/public/sw.js, apps/web/src/lib/serviceworker.ts, apps/web/src/main.tsx

## T-104 — Inscrição do aparelho [concluída]

- Refs: US-066, AC-157, AC-158
- Arquivos: packages/db/prisma/schema.prisma, packages/shared/src/push.schema.ts, apps/api/src/modules/push/push.service.ts, apps/api/src/modules/push/push.routes.ts

## T-105 — Envio do aviso [concluída]

- Refs: US-066, AC-159, AC-160
- Arquivos: apps/api/src/modules/push/push.sender.ts, apps/api/src/modules/push/push.service.test.ts

## T-106 — Autorizar pelas Configurações [concluída]

- Refs: US-066
- Arquivos: apps/web/src/lib/push.ts, apps/web/src/pages/Settings.tsx
