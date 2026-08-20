# packages/shared — os contratos

Schemas Zod compartilhados entre `apps/api` e `apps/web`. **Fonte única de verdade dos
contratos**: o mesmo schema valida o corpo da requisição no Fastify e o formulário no SPA.

Duplicar um limite nos dois lados é exatamente como as duas pontas divergem em silêncio —
um dia o formulário aceita 300 caracteres e a API recusa em 280, e ninguém sabe explicar.

## Os dois schemas de saída de perfil

| Schema | Para quem | Instituição e cidade |
|---|---|---|
| `publicProfileSchema` | terceiros | obrigatórias — só perfil completo existe para os outros |
| `myProfileSchema` | o próprio dono | podem ser nulas — existe um intervalo real entre criar a conta e concluir o onboarding (AC-009) |

**Nenhum dos dois tem campo de e-mail** (P-002). Isso é o que transforma "lembre de não
devolver o e-mail" numa garantia: a rota que tentasse falharia na validação de saída. Não
adicione o campo, nem crie um terceiro schema que o inclua.

## Ao adicionar um campo pessoal

O P-010 pede que a spec da feature que o introduz escreva **por que a rede não funciona sem
ele** (LGPD art. 6º, III — necessidade). Campo pessoal sem justificativa escrita é campo que
não entra.

## Os números que moram aqui, e não no código que os usa

`INVITE_QUOTA` (5 a cada 30 dias) e `INVITE_VALIDITY_DAYS` (15) são lidos pela API **e**
pela tela. A tela não escreve "vale por 15 dias" à mão: ela lê a constante. Um literal
repetido nos dois lados é como a tela passa a prometer um prazo que o servidor não pratica.

`INVITE_VALIDITY_DAYS` merece leitura antes de mexer. Ele caiu de 30 para 15 no dia em que
o convite deixou de ser de uso único, e o comentário no arquivo explica o que ele contém
(o vazamento lento) e o que ele **não** contém (o link colado num grupo de trezentas
pessoas). Aumentá-lo devolve a janela que a mudança abriu.

## `inviteStatusSchema`: `null` não é zero

`restantes` é `null` para quem não tem teto — coordenação e moderação —, e não um número
grande fingindo de infinito. A diferença aparece na tela: `null` vira "você não tem limite",
`0` vira "restam 0". Um sentinela numérico obrigaria a interface a adivinhar qual é qual.

## `accountExportSchema.referral`

A indicação faz parte dos dados do titular tanto quanto uma publicação — é um vínculo entre
ele e outra pessoa, e deixá-la de fora tornaria a exportação incompleta (LGPD art. 18, V).

Só o **nome** de quem convidou e de quem entrou. Nem e-mail, nem identificador: a exportação
é dos dados de quem pediu, e o P-002 vale aqui como em toda saída da API.
