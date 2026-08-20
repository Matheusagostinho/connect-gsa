# Tasks: Feed e reações

> feature: feed-e-reacoes

## T-016 — Contratos do post, das reações e dos comentários [concluida]

- Refs: US-010, US-012, AC-025
- Arquivos: packages/shared/src/reaction.ts, packages/shared/src/post.schema.ts, packages/shared/src/index.ts
- Notas: As cinco reações e seus rótulos vivem aqui — SPA e API leem a mesma lista.

## T-017 — Modelo de post, reação e comentário [concluida]

- Refs: US-010, US-012, US-013, AC-031
- Arquivos: packages/db/prisma/schema.prisma, packages/db/src/schema.test.ts
- Notas: `@@unique([postId, userId])` na reação é o que torna "uma só, trocável" uma
  garantia do banco. Índice composto para paginação por cursor.

## T-018 — Guarda de imagens: driver de armazenamento e reprocessamento [concluida]

- Refs: US-011, AC-026, AC-027, AC-028
- Arquivos: apps/api/src/modules/media/storage.ts, apps/api/src/modules/media/local-storage.ts, apps/api/src/modules/media/image.ts, apps/api/src/modules/media/image.test.ts
- Notas: Toda imagem é REPROCESSADA — foto de celular carrega GPS no EXIF, e guardá-la
  crua vazaria a coordenada exata de um estudante (P-001). O tipo é decidido pelos bytes
  do arquivo, nunca pela extensão nem pelo cabeçalho do navegador.

## T-019 — Rotas de envio de imagem [concluida]

- Refs: US-011, AC-029
- Arquivos: apps/api/src/modules/media/media.routes.ts
- Notas: Depende de T-018.

## T-020 — Ranking do feed [concluida]

- Refs: US-014, AC-035, AC-036, AC-037, AC-038
- Arquivos: apps/api/src/modules/feed/ranking.ts, apps/api/src/modules/feed/ranking.test.ts
- Notas: Função pura, sem banco e sem relógio implícito — é o que permite testar cada
  regra isoladamente. Inspirada no `xai-org/x-algorithm`, sem copiar pesos: lá eles
  multiplicam probabilidades previstas, aqui temos contagens.

## T-021 — Posts, feed, reações e comentários na API [concluida]

- Refs: US-010, US-012, US-013, US-014, AC-023, AC-024, AC-030, AC-032, AC-033, AC-034, AC-039
- Arquivos: apps/api/src/modules/post/post.service.ts, apps/api/src/modules/post/post.routes.ts, apps/api/src/modules/post/post.mapper.ts, apps/api/src/modules/post/post.routes.test.ts, apps/api/src/modules/feed/feed.service.ts, apps/api/src/modules/feed/feed.routes.ts, apps/api/src/modules/feed/feed.routes.test.ts
- Notas: Depende de T-016, T-017 e T-020.

## T-022 — Sair da conta [concluida]

- Refs: US-015, AC-040
- Arquivos: apps/api/src/routes/auth.ts, apps/api/src/auth/logout.test.ts, apps/web/src/components/AccountMenu.tsx
- Notas: Precisa encerrar tanto a sessão real do Better Auth quanto a de desenvolvimento.

## T-023 — Feed, composição e reações na tela [concluida]

- Refs: US-010, US-012, US-013, US-014
- Arquivos: apps/web/src/pages/Feed.tsx, apps/web/src/components/PostCard.tsx, apps/web/src/components/Composer.tsx, apps/web/src/components/ReactionBar.tsx, apps/web/src/components/ReactionBar.test.tsx, apps/web/src/components/Avatar.tsx, apps/web/src/lib/feed.ts, apps/web/src/lib/api.ts, apps/web/src/App.tsx
- Notas: Animação de reação minimalista, com mola curta — e desligada por
  `prefers-reduced-motion`. Depende de T-021.

## T-024 — Foto de perfil na tela [concluida]

- Refs: US-011, AC-029
- Arquivos: apps/web/src/pages/Profile.tsx, apps/web/src/components/AvatarUpload.tsx, apps/web/src/testing/setup.ts
- Notas: Depende de T-019.

## T-025 — Documentação da fatia [concluida]

- Refs: US-014
- Arquivos: README.md, apps/api/AGENTS.md, apps/web/AGENTS.md, packages/db/AGENTS.md, .env.example
- Notas: Registrar de onde vem o ranking e por que os pesos do X não foram copiados.
