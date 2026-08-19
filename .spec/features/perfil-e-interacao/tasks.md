# Tasks: Perfil estilo X e reação por pressionar

> feature: perfil-e-interacao

## T-061 — Modo imersivo no AppShell e o mapa de volta à moldura [concluida]

- Refs: US-043, AC-104
- Arquivos: apps/web/src/components/AppShell.tsx, apps/web/src/components/AppShell.test.tsx, apps/web/src/pages/MapPage.tsx
- Notas: o mapa desenhava a própria navegação. Uma estrutura, dois arranjos — não
  duas cópias que só por acaso combinam.

## T-062 — Centralizar o modal da cidade [concluida]

- Refs: US-043, AC-105
- Arquivos: apps/web/src/components/CityModal.tsx, apps/web/src/components/CityModal.test.tsx
- Notas: `mt-auto mb-0` matou o `margin: auto` que centraliza o `dialog` nativo.

## T-063 — Cabeçalho de página e coluna da direita [concluida]

- Refs: US-043, AC-104
- Arquivos: apps/web/src/components/PageHeader.tsx, apps/web/src/components/RightRail.tsx, apps/web/src/components/AppShell.tsx, apps/web/src/components/FeedTabs.tsx, apps/web/src/pages/Feed.tsx, apps/web/src/pages/Directory.tsx, apps/web/src/pages/Connections.tsx, apps/web/src/pages/Notifications.tsx, apps/web/src/pages/Announcements.tsx, apps/web/src/pages/Settings.tsx
- Notas: o `TopBar` foi absorvido pelo `PageHeader` — eram o mesmo cabeçalho
  escrito duas vezes, um para cada tamanho de tela. Os títulos grandes das
  páginas saíram: o cabeçalho fixo passa a ser o único `h1`.

## T-064 — Onboarding dentro da moldura ao editar [concluida]

- Refs: US-044, AC-106, AC-107
- Arquivos: apps/web/src/pages/Onboarding.tsx, apps/web/src/pages/Onboarding.test.tsx

## T-065 — Contagem de conexões e publicações no perfil [concluida]

- Refs: US-045, AC-109
- Arquivos: packages/shared/src/profile.schema.ts, apps/api/src/modules/profile/profile.mapper.ts, apps/api/src/modules/profile/profile.service.ts, apps/api/src/modules/profile/profile.routes.ts, apps/api/src/modules/profile/profile.routes.test.ts

## T-066 — Perfil refeito, com publicações e apresentação única [concluida]

- Refs: US-045, AC-108, AC-110
- Arquivos: apps/web/src/components/ProfileView.tsx, apps/web/src/components/ProfileView.test.tsx, apps/web/src/pages/Profile.tsx, apps/web/src/pages/PublicProfile.tsx
- Notas: o teste da faixa pegou um defeito real — aplicar `% 360` a cada passo do
  hash derretia a entropia e dois ids diferentes caíam no mesmo tom.

## T-067 — Reação só com ícone, aberta ao pressionar e segurar [concluida]

- Refs: US-046, AC-111, AC-112, AC-113, AC-114
- Arquivos: apps/web/src/components/ReactionBar.tsx, apps/web/src/components/ReactionBar.test.tsx
