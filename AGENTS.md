# ConnectGSA — visão geral

Rede social **fechada** para participantes do Programa de Embaixadores Estudantis do
Google. Fechada não é adjetivo de marketing: é o requisito que molda quase toda decisão
técnica deste repositório.

## Antes de mexer em qualquer coisa

1. Leia `.spec/constituicao.md`. São 13 princípios; os marcados `[DEVE]` têm verificação
   executável e **quebram a auditoria** se violados. Nunca "conserte" um princípio para
   fazer a auditoria passar — conserte o código.
2. Leia o `AGENTS.md` da pasta que você vai tocar.
3. Leia a spec da feature em `.spec/features/<feature>/spec.md`.

## Fluxo de trabalho (spec-anchored)

Toda feature passa por: **especificar → tarefas → implementar → verificar → auditar**.

- Cada critério de aceite vira um teste com `@spec:AC-xxx` no título.
- Cada princípio `[DEVE]` com verificação por teste tem `@principle:P-xxx` no título.
- **Quem decide se um critério passou é o test runner**, nunca a pessoa que implementou.

O motor que faz essa auditoria é uma ferramenta **local**, instalada fora deste
repositório, e roda na sua máquina — nunca no CI. O repositório versiona a spec e a *prova*
(`.spec/verification/<feature>.json`), não o motor.

Sem a ferramenta instalada nada quebra: os testes continuam sendo a fonte da verdade, e a
anotação `@spec:AC-xxx` no título é só um rótulo. Quem for contribuir não precisa dela —
precisa dos testes passando.

## Mapa do repositório

| Pasta | O que é |
|---|---|
| `apps/api` | Fastify + Better Auth + CASL. Onde toda decisão de segurança acontece. |
| `apps/web` | SPA em Vite + React. Só experiência de uso — nunca controle de acesso. |
| `packages/db` | Schema Prisma e client. Fonte de verdade dos dados. |
| `packages/shared` | Schemas Zod compartilhados entre API e SPA. Fonte única de contrato. |
| `packages/config` | TypeScript, ESLint e Prettier compartilhados. |
| `.spec` | Constituição, specs e provas de verificação. **É versionado.** |

## Convenções

- **Código em inglês, comunicação em português.** Identificadores, nomes de arquivo e de
  coluna em inglês; comentários, mensagens ao usuário e documentação em português.
- **Comentário explica por quê, não o quê.** Se o comentário parafraseia a linha abaixo,
  apague o comentário.
- **Commits em Conventional Commits**, sem trailer de co-autor.
- Anotação e ferramental de assistente de código ficam **fora** do repositório, por opção
  do dono do projeto. O `.gitignore` lista os nomes por isso.

## Comandos

```bash
pnpm install
docker compose up -d          # Postgres local na porta 5433
pnpm db:migrate               # aplica migrações
pnpm db:seed                  # 5.571 municípios + 94 instituições
pnpm dev                      # API (3333) + SPA (5173)
pnpm test                     # suíte inteira — precisa do Postgres no ar
pnpm turbo run lint typecheck
```

## Onde as decisões estão registradas

- Arquitetura, custos e escolha de infraestrutura: `README.md`.
- Suposições e perguntas em aberto: tabelas no fim de cada `spec.md`.
