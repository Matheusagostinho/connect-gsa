# Tasks: Convite aberto, com prazo curto

> feature: convite-aberto

## T-094 — O vínculo "entrei por este convite" muda de lado [concluída]

- Refs: US-063, AC-146, AC-148
- Arquivos: packages/db/prisma/schema.prisma, packages/db/prisma/migrations/20260820100000_convite_aberto/migration.sql, packages/db/src/schema.test.ts
- Notas: a coluna nova é preenchida a partir do vínculo antigo ANTES de ele ser
  derrubado. Invertendo os passos, o histórico seria jogado fora sem aviso.

## T-095 — A reserva atômica sai, e `claim` vira `resolve` [concluída]

- Refs: US-063, AC-146, AC-147, AC-150
- Arquivos: apps/api/src/modules/invite/invite.service.ts, apps/api/src/auth/better-auth.ts, apps/api/src/modules/invite/invite.service.test.ts, apps/api/src/modules/invite/invite.routes.test.ts, apps/api/src/auth/auth.gate.test.ts
- Notas: nada mais é reservado, então "claim" passaria a mentir no nome.
  `releaseInvite` foi removida — não há reserva a devolver.

## T-096 — Validade de 15 dias [concluída]

- Refs: US-063, AC-149
- Arquivos: packages/shared/src/invite.schema.ts, apps/web/src/components/InviteShare.tsx

## T-097 — Emendar P-009, AC-005 e AC-007 [concluída]

- Refs: US-063
- Arquivos: .spec/constituicao.md, .spec/features/acesso-e-perfil/spec.md
