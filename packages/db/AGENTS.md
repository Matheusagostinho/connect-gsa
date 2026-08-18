# packages/db — schema e client do Postgres

Prisma 7. Fonte de verdade de todo dado persistente do ConnectGSA.

## O que nunca pode voltar para cá

**Não existe, e não deve passar a existir, coluna de latitude ou longitude em `User`**
(P-001). A posição de um embaixador no mapa é o centroide da `City` que ele escolheu.
Guardar coordenada do aparelho transformaria um vazamento de banco em vazamento de
paradeiro de estudantes — e `src/schema.test.ts` reprova a migração que tentar.

Os outros guardas estruturais no mesmo arquivo:

- `visibleOnMap` com default `false` — aparecer no mapa é escolha ativa (AC-015).
- `InviteCode.codeHash`, nunca o código em claro (P-009).
- `InviteCode.usedById @unique` — é o BANCO que recusa o segundo uso do mesmo convite,
  mesmo se duas requisições passarem juntas pela checagem da aplicação (AC-007).

## Convenção de nomes

`User`, `Session`, `Account` e `Verification` seguem o schema canônico do Better Auth: os
nomes de campo são exigidos pela biblioteca e não podem ser traduzidos. Os modelos e campos
próprios do ConnectGSA seguem a mesma convenção (inglês) para o schema ficar coerente.

## Particularidades do Prisma 7

- A URL de conexão **saiu** do `schema.prisma` e vive em `prisma.config.ts`. Ela é usada só
  pelo CLI; em runtime quem conecta é o driver adapter de `src/client.ts`.
- O client é gerado em `src/generated/` e **não é versionado** — rode `pnpm db:generate`.
- `createPrismaClient` escolhe o adapter pela string de conexão: driver serverless do Neon
  quando o host é `neon.tech`, `pg` no restante. Isso não é firula — o Cloud Run escala
  horizontalmente e abriria uma conexão TCP por instância, o suficiente para esgotar o
  limite do Postgres. **Em produção use sempre a string do pooler do Neon, não a direta.**

## Seed

`prisma/data/cities.json` tem os 5.571 municípios com código do IBGE e centroide, gerado a
partir da API de localidades do IBGE cruzada com o dataset de coordenadas. É idempotente
(`skipDuplicates`) e nunca cria usuário, convite ou sessão: dado de pessoa não entra por
seed.

```bash
pnpm db:migrate       # aplica migrações em desenvolvimento
pnpm db:seed          # municípios e instituições
pnpm db:seed:dev      # pessoas fictícias, só fora de produção
pnpm db:test:setup    # prepara o banco separado da suíte de testes
```

`seed-dev.ts` cria pessoas com e-mails em `example.invalid` — domínio reservado justamente
para isso, que não existe e nunca vai existir. Ele se recusa a rodar em produção: essas
contas entrariam na rede sem passar pelo portão de convite.

O banco de testes é separado (`connectgsa_test`) porque a suíte limpa tabelas inteiras
entre casos. O `docker-compose.yml` o cria junto do de desenvolvimento na primeira subida
do volume.
