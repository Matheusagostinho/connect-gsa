# Spec: Indicação, quebra de linha e contribuição

> feature: indicacao
> status: implementada

## Contexto

**A indicação.** Quem gera um convite passa a constar como indicador de quem
entrou por ele. O vínculo já existia no banco — `InviteCode` guarda quem criou e
quem usou —, mas ele **não sobrevive**: a linha do convite tem cascade, e excluir
quem convidou apagaria junto o registro de que essa pessoa trouxe cinco outras.
Para gamificação isso é dado que evapora, e evapora exatamente quando alguém sai.

A indicação passa a morar em quem foi INDICADO. Um convite é um papel que se
consome; a indicação é um fato. E a chave estrangeira é `SET NULL`, nunca
`CASCADE`: com cascade, excluir um embaixador apagaria em silêncio todo mundo
que ele convidou.

> **Nota de 2026-08-20.** Quando esta spec foi escrita, o convite ainda era de
> uma pessoa só. Ele deixou de ser no dia seguinte (`convite-aberto`), e é
> justamente por isso que a decisão desta fatia se sustentou: com um convite
> atendendo várias pessoas, guardar a indicação NO convite passaria a ser
> impossível — um convite teria vários indicados. A indicação já morava no lugar
> certo antes de a razão maior aparecer.

**A quebra de linha.** Quem escrevia uma publicação em parágrafos via tudo virar
uma linha só. A causa não estava na exibição — que já usa `whitespace-pre-wrap` —
e sim na ENTRADA: `sanitizeText` termina com `\s+ → ' '`, e isso achata a quebra
de linha junto com o espaço duplo. Para nome, bio e rótulo de habilidade esse
achatamento é o certo; para publicação e comentário, destrói o conteúdo.

**A contribuição.** Um caminho para o repositório, no rodapé da coluna de
navegação — e repetido em Configurações, porque no celular essa coluna não existe.

## Histórias

### US-061 — Saber quem eu trouxe para a rede

Como embaixador, quero que a rede registre quem entrou pelos meus convites, para
isso valer quando houver gamificação.

#### AC-139 — Entrar por convite registra quem indicou

- **Dado** que entro na rede usando o convite de outra pessoa
- **Quando** minha conta é criada
- **Então** ela fica registrada como quem me indicou

#### AC-140 — Quem entra pela lista aprovada não tem indicador

- **Dado** que entro pelo e-mail já aprovado pelo programa, sem convite
- **Quando** minha conta é criada
- **Então** não existe indicador — inventar um seria registrar um fato falso

#### AC-141 — A indicação sobrevive à saída de quem convidou

- **Dado** que fui indicado por alguém
- **Quando** essa pessoa exclui a conta
- **Então** eu continuo na rede, e minha indicação apenas deixa de apontar para
  alguém — excluir quem convidou não pode apagar quem foi convidado

#### AC-142 — A exportação de dados inclui a indicação

- **Dado** que peço meus dados
- **Quando** abro o arquivo
- **Então** ele traz quem me convidou e quem entrou pelos meus convites, pelo
  nome — sem e-mail nem identificador de terceiros

### US-062 — Publicar em parágrafos

Como embaixador, quero que minha publicação apareça com as quebras de linha que
escrevi, para poder separar ideias.

#### AC-143 — A quebra de linha sobrevive ao salvamento

- **Dado** que escrevo uma publicação em três parágrafos
- **Quando** ela é gravada e exibida
- **Então** as quebras de linha continuam lá

#### AC-144 — Sequência abusiva de linhas vazias é contida

- **Dado** um texto com dezenas de quebras de linha seguidas
- **Quando** ele é gravado
- **Então** sobram no máximo duas quebras, ou seja **uma** linha em branco entre
  os blocos — sem teto, uma publicação empurraria o resto do feed para fora da
  tela

#### AC-145 — Campo de uma linha continua achatado

- **Dado** um nome ou uma bio com quebra de linha
- **Quando** ele é gravado
- **Então** ele continua virando uma linha só, como antes

## Fora de escopo

- Gamificação em si: pontos, ranking e badges. Esta fatia só grava o fato.
- Mostrar a indicação no perfil público ou no diretório. Ela diz quem conhece
  quem, e tornar isso público merece decisão própria — não herdada.
- Cadeia de indicação (quem indicou quem indicou você).
- Recuperar as quebras de linha das publicações já achatadas: o texto original
  não existe mais em lugar nenhum.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-051 | A indicação mora em `User.invitedById`, não no convite. Convite é papel consumível; indicação é fato permanente | confirmada | Coluna criada com `SET NULL`; AC-141 prova que ela sobrevive |
| ASM-052 | A migração preenche o histórico a partir dos convites já usados, para a contagem não começar do zero | confirmada | `UPDATE` no fim de `20260819220000_indicacao` |
| ASM-053 | Uma linha em branco entre blocos é o teto (duas quebras seguidas). Zero não separa seção; duas já são ruído | confirmada | Implementado em `QUEBRAS_SEGUIDAS_MAX` |
| ASM-054 | A contagem de indicações aparece só para a própria pessoa, em Configurações. Ela diz quem conhece quem | confirmada | `GET /invites/status`, lido apenas pela própria sessão |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-033 | Quando a gamificação chegar, o ranking de indicações será público? Isso torna visível quem conhece quem | respondida | Não se decide aqui, e por isso a contagem nasce PRIVADA: só a própria pessoa vê a sua. Tornar público é decisão da fatia de gamificação, que terá o custo próprio a apresentar — um ranking de indicações é um grafo social exposto, e herdar isso desta fatia seria decidir por omissão |
| Q-034 | Alguém deve poder ver quem o indicou, ou isso fica só na exportação? | respondida | Só na exportação. O titular tem direito de saber (LGPD art. 18, V), e mostrar na tela transformaria a rede num mapa de quem conhece quem sem ninguém ter pedido isso |
