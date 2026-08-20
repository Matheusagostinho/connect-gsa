# packages/db — schema e client do Postgres

Prisma 7. Fonte de verdade de todo dado persistente do ConnectGSA.

## O que nunca pode voltar para cá

**Não existe, e não deve passar a existir, coluna de latitude ou longitude em `User`**
(P-001). A posição de um embaixador no mapa é o centroide da `City` que ele escolheu.
Guardar coordenada do aparelho transformaria um vazamento de banco em vazamento de
paradeiro de estudantes — e `src/schema.test.ts` reprova a migração que tentar.

Os outros guardas estruturais no mesmo arquivo:

- `visibleOnMap` com default `true` — invertido em 19/08/2026, com o motivo registrado no
  P-011 e prova em `schema.test.ts` (AC-015, AC-127).
- `InviteCode.codeHash`, nunca o código em claro (P-009).
- `InviteCode.expiresAt` **não é opcional**. Desde que o convite deixou de ser de uso
  único (20/08/2026), o prazo é o único freio que sobrou: um convite sem data seria um
  convite eterno e ilimitado. `schema.test.ts` reprova quem tentar torná-lo nulo.
- `PostReaction @@unique([postId, userId])` — é o que torna "uma reação por pessoa,
  trocável" uma garantia, e não uma intenção. Sem ele, dois toques rápidos no celular
  criariam duas reações e a contagem passaria a mentir.
- `Post.mediaKey` guarda a CHAVE, não a URL. Trocar de provedor de armazenamento não
  deveria exigir reescrever linhas do banco.
- `User.invitedById` é `SetNull` e **nunca** `Cascade`. É o registro de quem trouxe cada
  pessoa para a rede, e com cascade excluir um embaixador apagaria em silêncio todo mundo
  que ele convidou — erro que só apareceria no dia em que alguém saísse do programa, e aí
  já teria apagado.

## As duas colunas de convite em `User`, e por que são duas

Elas parecem redundantes e não são: têm vidas diferentes.

| Coluna | Diz | Vida |
|---|---|---|
| `invitedViaId` → `InviteCode` | por qual convite a pessoa entrou | morre com o convite (que morre com quem o emitiu, por cascade) |
| `invitedById` → `User` | quem trouxe a pessoa para a rede | **permanente** — vira nulo, nunca some |

Um convite é um papel que se consome; a indicação é um fato, e vai alimentar a gamificação.
Guardar a indicação no convite era o desenho antigo, e ele morria junto com quem convidou.

Repare também no LADO da relação: `invitedViaId` mora no usuário, não `usedById` no
convite. Foi essa inversão que o `convite_aberto` fez, porque com um convite atendendo
várias pessoas o lado "muitos" passou a ser o do usuário.

## Migração que apaga coluna: preencha a nova ANTES

`20260820100000_convite_aberto` é o exemplo. Ele cria `User.invitedViaId`, **copia** o
vínculo de `InviteCode.usedById` para lá, e só então derruba a coluna antiga. Invertendo os
dois últimos passos, o histórico de quem entrou por qual convite seria jogado fora sem uma
linha de aviso — e o `migrate deploy` passaria verde.

## Convenção de nomes

`User`, `Session`, `Account` e `Verification` seguem o schema canônico do Better Auth: os
nomes de campo são exigidos pela biblioteca e não podem ser traduzidos. Os modelos e campos
próprios do ConnectGSA seguem a mesma convenção (inglês) para o schema ficar coerente.

## Particularidades do Prisma 7

- A URL de conexão **saiu** do `schema.prisma` e vive em `prisma.config.ts`. Ela é usada só
  pelo CLI; em runtime quem conecta é o driver adapter de `src/client.ts`.
- O client é gerado em `src/generated/` e **não é versionado** — rode `pnpm db:generate`.
- `createPrismaClient` escolhe o adapter pela string de conexão: driver serverless do Neon
  quando o host é `neon.tech`, `pg` no restante. Isso não é firula — o contêiner do Render
  reinicia com frequência no plano gratuito (a hibernação derruba e sobe todo dia), e cada
  subida abriria conexões novas, o suficiente para esgotar o limite do Postgres. **Em
  produção use sempre a string do pooler do Neon, não a direta.**

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
