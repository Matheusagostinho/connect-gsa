# packages/config — configuração compartilhada

TypeScript, ESLint e Prettier de base, consumidos por todos os pacotes.

## As regras de lint que não são estilo

Estas defendem princípios da constituição. Mexer nelas é decisão de arquitetura:

- `no-console` — dado pessoal nunca vai para log (P-005). `console` direto escapa da redação
  configurada no logger do Fastify; use o logger da requisição.
- `@typescript-eslint/no-floating-promises` — promise ignorada em rota de API vira erro
  silencioso em produção.

## TypeScript

`strict` com `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` ligados. Os dois
incomodam no início e evitam a classe de bug que aparece só em produção: índice que não
existe e propriedade opcional recebendo `undefined` explícito.

A versão está fixada em **5.9.3**. O TypeScript 7 (compilador nativo em Go) já é `latest` no
npm, mas o ecossistema — Prisma, Vite, typescript-eslint — foi construído contra a 5.x.
Migrar é um trabalho próprio, com a suíte verde antes e depois, não um bump de versão.
