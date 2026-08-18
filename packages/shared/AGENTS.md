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
