# Tasks: Ajustes de produto

> feature: ajustes-de-produto

## T-046 — Separar apagar de moderar [concluida]

- Refs: US-028, AC-078, AC-079
- Arquivos: packages/shared/src/post.schema.ts, apps/api/src/modules/post/post.mapper.ts, apps/api/src/modules/post/post.service.ts, apps/api/src/modules/post/moderation.test.ts
- Notas: `canDelete` passa a significar "é meu"; `canModerate`, "não é meu e eu posso".

## T-047 — Links clicáveis sem estourar o cartão [concluida]

- Refs: US-029, AC-080, AC-081, AC-082
- Arquivos: apps/web/src/components/RichText.tsx, apps/web/src/components/RichText.test.tsx, apps/web/src/components/PostCard.tsx
- Notas: O link é reconhecido na EXIBIÇÃO, não gravado como marcação — o conteúdo continua
  texto puro no banco, que é o que impede injeção.

## T-048 — Reações com ícone no lugar de emoji [concluida]

- Refs: US-030, AC-083
- Arquivos: packages/shared/src/reaction.ts, apps/web/src/components/ReactionIcon.tsx, apps/web/src/components/ReactionBar.tsx, apps/web/src/components/ReactionBar.test.tsx

## T-049 — Marca, apresentação e endereços [concluida]

- Refs: US-028
- Arquivos: apps/web/src/components/Logo.tsx, apps/web/src/pages/Landing.tsx, apps/web/src/App.tsx, apps/web/src/components/ui.tsx, apps/web/src/lib/navigation.ts, apps/web/src/components/AmbassadorCardItem.tsx, apps/web/src/pages/Notifications.tsx, apps/web/src/components/SideNav.tsx, apps/web/src/components/PageHeader.tsx, apps/web/src/pages/Login.tsx, apps/web/src/pages/Invite.tsx, apps/web/src/pages/Onboarding.tsx, apps/web/src/pages/DevLogin.tsx
- Notas: Perfil de terceiros muda de `/e/{apelido}` para `/perfil/{apelido}`.
