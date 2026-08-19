# Tasks: Refino de interface e identidade editável

> feature: refino-de-interface

## T-068 — Recência mais forte no ranking [concluida]

- Refs: US-047, AC-115
- Arquivos: apps/api/src/modules/feed/ranking.ts, apps/api/src/modules/feed/ranking.test.ts
- Notas: encurtar a meia-vida não bastava. O engajamento somado cresce linear e um
  post muito reagido ficava imbatível — precisou entrar em logaritmo.

## T-069 — Nome de usuário editável, com o antigo respondendo [concluida]

- Refs: US-048, AC-117, AC-118, AC-119
- Arquivos: packages/db/prisma/schema.prisma, packages/db/prisma/migrations/20260819180000_nome_de_usuario_editavel/migration.sql, packages/shared/src/profile.schema.ts, apps/api/src/modules/profile/slug.ts, apps/api/src/modules/profile/slug.test.ts, apps/api/src/modules/profile/profile.service.ts, apps/api/src/modules/profile/profile.routes.test.ts

## T-070 — Cinco campos de link conhecidos [concluida]

- Refs: US-049, AC-120
- Arquivos: packages/shared/src/profile.schema.ts, packages/shared/src/links.ts, packages/shared/src/links.test.ts, packages/shared/src/index.ts, apps/web/src/pages/Onboarding.tsx, apps/web/src/pages/Onboarding.test.tsx
- Notas: ao pôr os campos na tela apareceu um defeito antigo — o formulário nunca
  semeava instituição, cidade e habilidades a partir do perfil, e salvar a
  partir de "Editar perfil" era recusado com "Escolha sua instituição" num perfil
  que já tinha uma. Editar não funcionava, e o erro apontava para o campo errado.

## T-071 — Largura única e Conexões fora da navegação [concluida]

- Refs: US-052, AC-124
- Arquivos: apps/web/src/lib/navigation.ts, apps/web/src/components/AppShell.tsx, apps/web/src/components/AppShell.test.tsx, apps/web/src/components/PageHeader.tsx, apps/web/src/pages/Feed.tsx, apps/web/src/pages/Directory.tsx, apps/web/src/pages/Connections.tsx, apps/web/src/pages/Notifications.tsx, apps/web/src/pages/Announcements.tsx, apps/web/src/pages/Settings.tsx, apps/web/src/pages/Profile.tsx, apps/web/src/pages/PublicProfile.tsx

## T-072 — Feed sem cartão, sem avisos, com atualizar e publicar flutuante [concluida]

- Refs: US-047, AC-116
- Arquivos: apps/web/src/components/PostCard.tsx, apps/web/src/components/Composer.tsx, apps/web/src/components/FeedTabs.tsx, apps/web/src/components/PullToRefresh.tsx, apps/web/src/components/PullToRefresh.test.tsx, apps/web/src/components/NewPostButton.tsx, apps/web/src/pages/Feed.tsx

## T-073 — Reação com resposta ao mouse e foguete decolando [concluida]

- Refs: US-050, AC-121
- Arquivos: apps/web/src/components/ReactionBar.tsx, apps/web/src/components/ReactionBar.test.tsx, apps/web/src/styles/tokens.css

## T-074 — Diretório com busca e filtros em painel [concluida]

- Refs: US-050
- Arquivos: apps/web/src/pages/Directory.tsx, apps/web/src/components/SkillFilterPanel.tsx

## T-075 — Perfil sem capa, com compartilhar e conexões clicável [concluida]

- Refs: US-050, US-051, AC-122, AC-123
- Arquivos: apps/web/src/components/ProfileView.tsx, apps/web/src/components/ProfileView.test.tsx, apps/web/src/components/ShareProfile.tsx, apps/web/src/pages/Profile.tsx, apps/web/src/pages/PublicProfile.tsx

## T-076 — Marca legível sobre o mapa no celular [concluida]

- Refs: US-050
- Arquivos: apps/web/src/components/PageHeader.tsx, apps/web/src/components/AppShell.tsx
