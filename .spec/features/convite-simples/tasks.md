# Tasks: Convite simples e apresentação animada

> feature: convite-simples

## T-083 — Código de convite curto e legível [concluida]

- Refs: US-058, AC-133, AC-134
- Arquivos: packages/shared/src/invite.schema.ts, apps/api/src/modules/invite/invite.code.ts, apps/api/src/modules/invite/invite.code.test.ts, apps/api/src/modules/invite/invite.service.ts

## T-084 — Todo embaixador convida, com teto [concluida]

- Refs: US-057, AC-131, AC-132
- Arquivos: apps/api/src/authz/abilities.ts, apps/api/src/authz/abilities.test.ts, apps/api/src/plugins/errors.ts, apps/api/src/modules/invite/invite.service.ts, apps/api/src/modules/invite/invite.routes.ts, apps/api/src/modules/invite/invite.routes.test.ts, apps/web/src/pages/Settings.tsx

## T-085 — Página de convite com quem convidou [concluida]

- Refs: US-059, AC-135, AC-136, AC-137
- Arquivos: packages/shared/src/invite.schema.ts, apps/api/src/modules/invite/invite.routes.ts, apps/api/src/modules/invite/invite.service.ts, apps/api/src/modules/invite/invite.routes.test.ts, apps/web/src/pages/Invite.tsx, apps/web/src/pages/Invite.test.tsx, apps/web/src/lib/invite-guardado.ts, apps/web/src/lib/session.ts, apps/web/src/pages/Login.tsx, apps/web/src/App.tsx

## T-086 — Nuvem no fundo da página e palavra animada [concluida]

- Refs: US-060
- Arquivos: apps/web/src/pages/Landing.tsx, apps/web/src/styles/tokens.css, apps/web/src/components/PixelCloud.tsx
- Notas: `<canvas>` tem tamanho intrínseco de 300×150 e `inset-0` não estica
  elemento com dimensão própria — a nuvem nascia minúscula no canto, e por ser
  transparente ninguém via que estava lá.

## T-087 — Pino do mapa sem o nome da cidade [concluida]

- Refs: US-060, AC-138
- Arquivos: apps/web/src/components/AmbassadorMap.tsx, apps/web/src/components/AmbassadorMap.test.tsx, apps/web/src/styles/tokens.css
- Notas: o pino monta `<img>` à mão (marcador do MapLibre não passa pelo React),
  então o recuo para a inicial quando a foto falha precisou ser repetido ali.
