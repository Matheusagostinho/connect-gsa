# Tasks: Navegação e notificações

> feature: navegacao-e-notificacoes

## T-036 — Marca de "visto até aqui" no usuário [concluida]

- Refs: US-025, AC-066, AC-067
- Arquivos: packages/db/prisma/schema.prisma, packages/db/prisma/migrations, packages/shared/src/notification.schema.ts, packages/shared/src/index.ts
- Notas: Uma coluna, não uma tabela. Ver ASM-019.

## T-037 — Notificações derivadas do que já existe [concluida]

- Refs: US-025, AC-065, AC-066, AC-067, AC-068
- Arquivos: apps/api/src/modules/notification/notification.service.ts, apps/api/src/modules/notification/notification.routes.ts, apps/api/src/modules/notification/notification.routes.test.ts, apps/api/src/app.ts
- Notas: Une pedidos de conexão, reações e comentários — sempre excluindo o próprio autor.

## T-038 — Estrutura de navegação: lateral no computador, inferior no celular [concluida]

- Refs: US-023, AC-061, AC-062, AC-063
- Arquivos: apps/web/src/components/AppShell.tsx, apps/web/src/components/AppShell.test.tsx, apps/web/src/components/SideNav.tsx, apps/web/src/components/BottomNav.tsx, apps/web/src/components/PageHeader.tsx, apps/web/src/components/AccountMenu.tsx, apps/web/src/lib/navigation.ts
- Notas: Uma estrutura só, dois arranjos por consulta de mídia — não dois componentes com
  regras duplicadas.

## T-039 — Mapa em tela cheia e telas migradas [concluida]

- Refs: US-024, AC-064
- Arquivos: apps/web/src/pages/MapPage.tsx, apps/web/src/pages/Feed.tsx, apps/web/src/pages/Directory.tsx, apps/web/src/pages/Connections.tsx, apps/web/src/pages/Profile.tsx, apps/web/src/pages/PublicProfile.tsx, apps/web/src/components/AmbassadorMap.tsx, apps/web/src/components/AmbassadorMap.test.tsx, apps/web/src/components/ui.tsx
- Notas: Depende de T-038.

## T-040 — Tela de notificações [concluida]

- Refs: US-025
- Arquivos: apps/web/src/pages/Notifications.tsx, apps/web/src/lib/notifications.ts, apps/web/src/App.tsx
- Notas: Depende de T-037 e T-038.

## T-041 — Roadmap e documentação [concluida]

- Refs: US-023
- Arquivos: docs/roadmap.md, README.md, apps/web/AGENTS.md, apps/api/AGENTS.md
