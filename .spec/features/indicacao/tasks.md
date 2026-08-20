# Tasks: Indicação, quebra de linha e contribuição

> feature: indicacao

## T-088 — A indicação passa a morar em quem foi indicado [concluída]

- Refs: US-061, AC-139, AC-140, AC-141
- Arquivos: packages/db/prisma/schema.prisma, packages/db/prisma/migrations/20260819220000_indicacao/migration.sql, apps/api/src/modules/invite/invite.service.ts, apps/api/src/modules/invite/invite.service.test.ts, apps/api/src/auth/auth.gate.test.ts
- Notas: `SET NULL` e nunca `CASCADE` — com cascade, excluir um embaixador
  apagaria em silêncio todo mundo que ele convidou.

## T-089 — Indicação na exportação de dados [concluída]

- Refs: US-061, AC-142
- Arquivos: packages/shared/src/account.schema.ts, apps/api/src/modules/account/account.service.ts, apps/api/src/modules/account/account.routes.test.ts

## T-090 — Contagem de indicações e teto visíveis [concluída]

- Refs: US-061
- Arquivos: packages/shared/src/invite.schema.ts, apps/api/src/modules/invite/invite.routes.ts, apps/web/src/components/InviteShare.tsx

## T-091 — Quebra de linha preservada na publicação [concluída]

- Refs: US-062, AC-143, AC-144, AC-145
- Arquivos: apps/api/src/modules/profile/sanitize.ts, apps/api/src/modules/profile/sanitize.test.ts, apps/api/src/modules/post/post.service.ts, apps/api/src/modules/post/announcement.routes.ts

## T-092 — Caminho para o repositório [concluída]

- Refs: US-062
- Arquivos: apps/web/src/lib/projeto.ts, apps/web/src/components/SideNav.tsx, apps/web/src/pages/Settings.tsx

## T-093 — Pino do mapa com cor invertida [concluída]

- Refs: US-062
- Arquivos: apps/web/src/styles/tokens.css
