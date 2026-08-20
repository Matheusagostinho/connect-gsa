# Tasks: Diretório, mapa e conexões

> feature: diretorio-mapa-e-conexoes

## T-026 — Contratos da descoberta e das conexões [concluida]

- Refs: US-016, US-017, US-019, US-020, US-021
- Arquivos: packages/shared/src/directory.schema.ts, packages/shared/src/connection.schema.ts, packages/shared/src/profile.schema.ts, packages/shared/src/invite.schema.ts, packages/shared/src/index.ts
- Notas: `ambassadorCardSchema` é o formato de pessoa em lista — diretório, mapa e conexões
  usam o mesmo, e ele não tem campo de e-mail.

## T-027 — Instituições por campus, catálogo de habilidades e slug [concluida]

- Refs: US-016, US-017, US-018, AC-041, AC-044
- Arquivos: packages/db/prisma/schema.prisma, packages/db/prisma/data/skills.json, packages/db/prisma/data/institutions.json, packages/db/prisma/seed.ts, packages/db/prisma/seed-dev.ts
- Notas: 628 instituições, incluindo os 38 Institutos Federais com seus campi — a lacuna
  que impedia quem estuda no IFNMG em Pirapora de se encontrar. `campus` é string vazia em
  vez de nulo porque no Postgres NULLs são distintos num índice único, e `@@unique([name,
  campus])` com nulo não impediria duplicata.

## T-028 — Slug do perfil [concluida]

- Refs: US-018, AC-046
- Arquivos: apps/api/src/modules/profile/slug.ts, apps/api/src/modules/profile/slug.test.ts, apps/api/src/modules/profile/profile.service.ts, apps/api/src/modules/profile/profile.mapper.ts, apps/api/src/modules/profile/public-profile.test.ts
- Notas: Derivado do nome no primeiro salvamento e nunca reescrito depois — endereço que já
  circulou em conversa não pode deixar de funcionar.

## T-029 — Diretório, mapa e proposta de instituição [concluida]

- Refs: US-016, US-017, US-019, US-020, AC-042, AC-043, AC-049, AC-051
- Arquivos: apps/api/src/modules/directory/directory.service.ts, apps/api/src/modules/directory/directory.routes.ts, apps/api/src/modules/directory/directory.routes.test.ts, apps/api/src/routes/reference.ts
- Notas: O mapa agrega por cidade — não é otimização, é a garantia de que a resposta não
  tem como carregar posição de uma pessoa (P-001, AC-054).

## T-030 — Conexões [concluida]

- Refs: US-021, AC-055, AC-056, AC-057, AC-058
- Arquivos: apps/api/src/modules/connection/connection.service.ts, apps/api/src/modules/connection/connection.routes.ts, apps/api/src/modules/connection/connection.routes.test.ts
- Notas: O par é guardado com o menor id primeiro. É a ordenação canônica que transforma o
  índice único do banco em garantia de que A→B e B→A são o mesmo laço.

## T-031 — Publicações no perfil e link de convite [concluida]

- Refs: US-018, US-022, AC-047, AC-059
- Arquivos: apps/api/src/modules/post/post.routes.ts, apps/api/src/modules/invite/invite.service.ts, apps/api/src/modules/invite/invite.routes.ts, apps/api/src/app.ts, apps/api/src/testing/db.ts
- Notas: O link é montado no servidor a partir da URL pública configurada. Construí-lo no
  cliente sairia com `localhost` durante os testes da coordenação.

## T-032 — Mapa na tela [concluida]

- Refs: US-020, AC-051, AC-052
- Arquivos: apps/web/src/components/AmbassadorMap.tsx, apps/web/src/pages/MapPage.tsx, apps/web/scripts/copiar-worker-do-mapa.mjs, apps/web/vite.config.ts, vercel.json
- Notas: MapLibre com tiles do OpenFreeMap — sem chave, sem cadastro e sem cookies. O worker
  precisa do módulo irmão copiado junto, senão o import falha DENTRO dele e o mapa fica
  cinza sem erro nenhum. O `firebase.json` deixou de reescrever `/assets/**` para o
  `index.html`, que foi o que mascarou essa falha.

## T-033 — Diretório, conexões e perfil público na tela [concluida]

- Refs: US-018, US-019, US-021
- Arquivos: apps/web/src/components/AmbassadorCardItem.tsx, apps/web/src/lib/directory.ts, apps/web/src/pages/Directory.tsx, apps/web/src/pages/Connections.tsx, apps/web/src/pages/PublicProfile.tsx, apps/web/src/App.tsx
- Notas: O mapa entra por `lazy` — ele pesa mais que todo o resto do aplicativo junto.

## T-034 — Seletores e compartilhamento de convite [concluida]

- Refs: US-016, US-017, US-022, AC-044, AC-060
- Arquivos: apps/web/src/components/SkillPicker.tsx, apps/web/src/components/InstitutionPicker.tsx, apps/web/src/components/InviteShare.tsx, apps/web/src/pages/Onboarding.tsx, apps/web/src/pages/Invite.tsx, apps/web/src/pages/Invite.test.tsx, apps/web/src/pages/Profile.tsx, apps/web/src/components/ui.tsx, apps/web/src/styles/tokens.css
- Notas: Habilidade é escolhida em catálogo, nunca digitada. E quem não achar a instituição
  propõe a sua ali mesmo, sem ficar travado.

## T-035 — Documentação da fatia [concluida]

- Refs: US-020
- Arquivos: README.md, apps/web/AGENTS.md, apps/api/AGENTS.md, packages/db/AGENTS.md
- Notas: Registrar por que MapLibre e não Mapbox, e a armadilha do worker.
