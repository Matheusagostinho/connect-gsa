# Tasks: Feed em abas e refino de interface

> feature: feed-em-abas-e-refino

## T-054 — Corrigir o cabeçalho de conteúdo sem corpo [concluida]

- Refs: US-037, AC-096
- Arquivos: apps/web/src/lib/api.ts, apps/web/src/lib/api.test.ts
- Notas: Um defeito, três fluxos quebrados — apagar publicação, apagar comentário e
  desfazer conexão.

## T-055 — Abas do feed e afinidade no ranking [concluida]

- Refs: US-038, AC-097, AC-098, AC-099
- Arquivos: packages/shared/src/post.schema.ts, apps/api/src/modules/feed/ranking.ts, apps/api/src/modules/feed/ranking.test.ts, apps/api/src/modules/feed/feed.service.ts, apps/api/src/modules/feed/feed.routes.ts, apps/api/src/modules/feed/feed.routes.test.ts, apps/web/src/components/FeedTabs.tsx, apps/web/src/pages/Feed.tsx, apps/web/src/lib/feed.ts

## T-056 — Conectar a partir do cartão da publicação [concluida]

- Refs: US-040, AC-101
- Arquivos: apps/api/src/modules/post/post.mapper.ts, apps/api/src/modules/post/post.service.ts, apps/web/src/components/PostCard.tsx

## T-057 — Caixa de notificações no cabeçalho [concluida]

- Refs: US-039, AC-100
- Arquivos: apps/web/src/components/NotificationBell.tsx, apps/web/src/components/NotificationBell.test.tsx, apps/web/src/components/AppShell.tsx, apps/web/src/components/PageHeader.tsx, apps/web/src/components/SideNav.tsx

## T-058 — Reações animadas [concluida]

- Refs: US-041, AC-102
- Arquivos: apps/web/src/components/ReactionBar.test.tsx, apps/web/src/components/ReactionIcon.tsx, apps/web/src/components/ReactionBar.tsx, apps/web/src/styles/tokens.css, packages/shared/src/reaction.ts

## T-059 — Mapa como fundo no celular, com modal da cidade [concluida]

- Refs: US-042, AC-103
- Arquivos: apps/web/src/pages/MapPage.tsx, apps/web/src/components/CityModal.tsx, apps/web/src/components/CityModal.test.tsx, apps/web/src/components/AmbassadorMap.tsx, apps/web/src/styles/tokens.css

## T-060 — Refino de espaço no celular [concluida]

- Refs: US-038, AC-101
- Arquivos: apps/web/src/components/AppShell.tsx, apps/web/src/components/PageHeader.tsx, apps/web/src/components/PostCard.tsx, apps/web/src/pages/Feed.tsx
- Notas: o nome de quem publica vence o rótulo do botão de conectar — no celular o
  botão fica só com o ícone, e o rótulo continua para leitor de tela.
