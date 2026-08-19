# Tasks: Dados do titular

> feature: dados-do-titular

## T-042 — Contrato da exportação [concluida]

- Refs: US-026, AC-069, AC-070
- Arquivos: packages/shared/src/account.schema.ts, packages/shared/src/index.ts

## T-043 — Exportar e excluir [concluida]

- Refs: US-026, US-027
- Arquivos: apps/api/src/modules/account/account.service.ts, apps/api/src/modules/account/account.routes.ts, apps/api/src/modules/account/account.routes.test.ts, apps/api/src/app.ts
- Notas: A exclusão corrige os contadores desnormalizados ANTES da cascata, senão os posts
  de terceiros ficam mentindo para sempre. E apaga as imagens do armazenamento, não só as
  linhas.

## T-044 — Tela de dados e exclusão [concluida]

- Refs: US-026, US-027, AC-076
- Arquivos: apps/web/src/pages/Settings.tsx, apps/web/src/lib/account.ts, apps/web/src/App.tsx, apps/web/src/components/AccountMenu.tsx, apps/web/src/pages/Profile.tsx
- Notas: Depende de T-043.

## T-045 — Documentação [concluida]

- Refs: US-027
- Arquivos: README.md, docs/roadmap.md, .spec/constituicao.md, apps/api/AGENTS.md
- Notas: O P-012 deixa de ser [RECOMENDADO] e passa a [DEVE], com verificação executável.
