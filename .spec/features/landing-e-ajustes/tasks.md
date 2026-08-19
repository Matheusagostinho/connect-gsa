# Tasks: Apresentação viva e ajustes de interface

> feature: landing-e-ajustes

## T-077 — Nuvem de pixels na apresentação [concluida]

- Refs: US-053, AC-125, AC-126
- Arquivos: apps/web/src/components/PixelCloud.tsx, apps/web/src/components/PixelCloud.test.tsx, apps/web/src/pages/Landing.tsx

## T-078 — Perfil novo nasce visível no mapa [concluida]

- Refs: US-054, AC-127, AC-128
- Arquivos: .spec/constituicao.md, packages/db/prisma/schema.prisma, packages/db/prisma/migrations/20260819200000_mapa_visivel_por_padrao/migration.sql, apps/api/src/modules/profile/profile.routes.test.ts, apps/web/src/pages/Onboarding.tsx
- Notas: inverte o P-011 e o AC-015. Decisão do dono do produto, com o custo
  apresentado. Quem já tem perfil NÃO é migrado.

## T-079 — Conectar pelo cartão responde na hora [concluida]

- Refs: US-055, AC-129
- Arquivos: apps/web/src/lib/directory.ts, apps/web/src/components/PostCard.tsx, apps/web/src/components/PostCard.test.tsx
- Notas: além do cache, os TRÊS estados do laço passaram a ser visíveis. O botão
  sumir depois do toque não dizia se o pedido saiu, se falhou ou se as duas
  pessoas já eram conexão — e sumir era o que acontecia quando tocar em
  "Conectar" aceitava um pedido que já esperava do outro lado.
- Notas: a lista de caches invalidados não incluía o feed, então o cartão nunca
  sabia que o pedido tinha sido enviado.

## T-080 — Abas e cabeçalho do perfil [concluida]

- Refs: US-056, AC-130
- Arquivos: apps/web/src/components/ProfileView.tsx, apps/web/src/components/ProfileView.test.tsx, apps/web/src/components/Avatar.tsx, apps/web/src/components/Avatar.test.tsx, apps/web/src/components/AvatarUpload.tsx

## T-081 — Avisos fora do menu [concluida]

- Refs: US-056
- Arquivos: apps/web/src/lib/navigation.ts

## T-082 — Layout que não salta entre seções [concluida]

- Refs: US-056
- Arquivos: apps/web/src/styles/tokens.css, apps/web/src/components/AppShell.test.tsx
- Notas: o feed rola e tem barra, o diretório e o mapa não têm — o contêiner
  centralizado se deslocava a cada navegação. Invisível em navegador de barra
  sobreposta, que é onde os testes de navegador rodam.
