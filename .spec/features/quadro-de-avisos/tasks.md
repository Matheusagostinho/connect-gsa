# Tasks: Quadro de avisos

> feature: quadro-de-avisos

## T-050 — Contrato do aviso [concluida]

- Refs: US-034, US-035
- Arquivos: packages/shared/src/post.schema.ts, apps/api/src/modules/post/post.mapper.ts
- Notas: O modelo já distingue `feed` de `announcement`; falta expor isso no contrato.

## T-051 — Publicar, listar e remover avisos [concluida]

- Refs: US-034, US-035, US-036, AC-090, AC-091, AC-092, AC-095
- Arquivos: apps/api/src/modules/post/announcement.routes.ts, apps/api/src/modules/post/announcement.routes.test.ts, apps/api/src/modules/post/post.service.ts, apps/api/src/app.ts
- Notas: A autorização reusa o CASL que já existe (`manage Announcement`). Ordenação
  cronológica pura — comunicado não disputa atenção por engajamento.

## T-052 — Quadro na tela e destaque no feed [concluida]

- Refs: US-035, AC-093, AC-094
- Arquivos: apps/web/src/pages/Announcements.tsx, apps/web/src/lib/announcements.ts, apps/web/src/components/AnnouncementBanner.tsx, apps/web/src/components/PostCard.tsx, apps/web/src/pages/Feed.tsx, apps/web/src/App.tsx, apps/web/src/lib/navigation.ts
- Notas: Um quadro que ninguém visita é um quadro morto — daí o destaque no feed.

## T-053 — Documentação [concluida]

- Refs: US-034
- Arquivos: README.md, docs/roadmap.md, apps/api/AGENTS.md
