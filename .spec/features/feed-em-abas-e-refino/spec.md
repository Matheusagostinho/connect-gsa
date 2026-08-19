# Spec: Feed em abas e refino de interface

> feature: feed-em-abas-e-refino
> status: implementada

## Contexto

Correções e refinamentos encontrados usando o produto. O defeito mais grave era
silencioso e derrubava três fluxos de uma vez: **nenhuma exclusão funcionava pela
tela** — nem apagar publicação, nem apagar comentário, nem desfazer conexão. O
cliente anunciava `Content-Type: application/json` numa requisição sem corpo, e o
servidor recusava. Cada fluxo parecia um bug isolado; era um só.

O resto é refino: o feed ganha duas abas, a notificação passa a abrir onde a
pessoa está em vez de exigir uma viagem à página, as reações ganham animação, e o
mapa no celular passa a ser o fundo da tela em vez de um retângulo dentro dela.

Sobre a aba "Para você": ela **ordena**, não filtra. Curso, estado e habilidades em
comum passam a impulsionar bastante — mas um filtro rígido deixaria a tela inicial
de quem acabou de chegar completamente vazia, que é o pior primeiro dia possível.

## Histórias

### US-037 — Conseguir apagar o que publiquei

Como embaixador, quero que apagar realmente apague, para não ficar com conteúdo
que pedi para remover.

#### AC-096 — Apagar pela tela funciona

- **Dado** que uma requisição não tem corpo para enviar
- **Quando** ela é montada pelo cliente
- **Então** ela não anuncia um tipo de conteúdo que não existe — anunciar sem enviar faz
  o servidor recusar antes de olhar a rota

### US-038 — Escolher entre descobrir e acompanhar

Como embaixador, quero alternar entre um feed que me apresenta gente afim e um que
mostra só quem já é minha conexão, para escolher o que quero naquele momento.

#### AC-097 — "Seguindo" traz só quem é minha conexão

- **Dado** que estou conectado com uma pessoa e não com outra
- **Quando** abro a aba "Seguindo"
- **Então** vejo publicações da minha conexão e do meu próprio perfil, e não de quem não
  é conexão

#### AC-098 — "Para você" sobe quem tem afinidade comigo

- **Dado** duas publicações igualmente engajadas, uma de alguém do meu curso e outra de
  alguém sem nada em comum
- **Quando** abro a aba "Para você"
- **Então** a de quem tem afinidade aparece antes

#### AC-099 — "Para você" nunca fica vazio por falta de afinidade

- **Dado** que não tenho nenhuma afinidade com ninguém da rede
- **Quando** abro "Para você"
- **Então** ainda vejo as publicações da rede — afinidade ordena, não exclui

### US-039 — Ver notificações sem sair de onde estou

Como embaixador, quero abrir minhas notificações recentes a partir do cabeçalho,
para não precisar trocar de página só para checar.

#### AC-100 — O sino abre as notificações recentes ali mesmo

- **Dado** que tenho notificações
- **Quando** clico no sino, no computador ou no celular
- **Então** abre uma caixa com as mais recentes, sem trocar de página, e com um caminho
  para ver todas

### US-040 — Conectar direto do feed

Como embaixador, quero pedir conexão com quem publicou sem sair do feed, para não
perder o contexto do que me chamou atenção.

#### AC-101 — A publicação de quem não é conexão oferece conectar

- **Dado** uma publicação de alguém com quem não estou conectado
- **Quando** vejo o cartão
- **Então** há um caminho para pedir conexão; nas minhas próprias publicações e nas de
  quem já é conexão, não

### US-041 — Ver a reação ganhar cor

Como embaixador, quero que a reação que escolhi ganhe cor e seja desenhada na tela,
para o toque ter resposta visível em vez de parecer que nada aconteceu.

#### AC-102 — A reação escolhida fica colorida e é desenhada

- **Dado** que reagi a uma publicação
- **Quando** o cartão é mostrado
- **Então** o ícone da minha reação aparece na cor dela, e o traço é desenhado na
  troca — nunca para quem pediu menos movimento

### US-042 — Usar o mapa inteiro no celular

Como embaixador, quero o mapa ocupando a tela do celular, para enxergar a rede em
vez de espiar por uma janela.

#### AC-103 — No celular o mapa é o fundo, e a cidade abre em modal

- **Dado** que abro o mapa no celular
- **Quando** toco no pino de uma cidade
- **Então** o mapa ocupa a tela toda, a marca e a conta flutuam por cima, e a lista de
  quem está naquela cidade abre em modal — com o mapa visível atrás

## Fora de escopo

- Notificações em tempo real: hoje a caixa é atualizada por consulta periódica, não por
  conexão viva. Continua sendo a Fatia 10 do roadmap.
- Marcar notificação individual como lida.
- Aba "Seguindo" com ordenação própria: ela usa o mesmo ranking, só muda quem entra.
- Deixar de seguir sem desfazer a conexão.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-033 | "Para você" ordena por afinidade em vez de filtrar. Filtrar deixaria a tela inicial de quem chega agora vazia — e quem chega agora é justamente quem mais precisa ver a rede | confirmada | Mantida. `buildFeed` não aplica filtro nenhum em `forYou`; a afinidade entra como impulso no `ranking.ts`. AC-099 prova que a rede inteira aparece mesmo sem afinidade nenhuma |
| ASM-034 | Afinidade é curso, estado, habilidade em comum, instituição ou cidade. Basta uma para contar, e mais de uma soma | confirmada | Implementada em `PROXIMITY_BOOST`. Habilidade em comum tem teto (`sharedSkillsCap`) para que uma pessoa com muitas habilidades não domine o feed de quem tem poucas |
| ASM-035 | "Seguindo" inclui as próprias publicações: um feed de conexões sem o que você mesmo publicou parece quebrado | confirmada | `authorId: { in: [...conectados, viewer.userId] }`. Provada por AC-097 |
| ASM-036 | A caixa de notificações mostra as cinco mais recentes. Mais que isso vira uma segunda página dentro de um menu | confirmada | `QUANTAS_NA_CAIXA = 5`, com link para a página inteira. O corte é testado — mais notificações não esticam a caixa |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-023 | Qual aba abre por padrão? Hoje é "Para você" — mas quem já tem muitas conexões talvez prefira "Seguindo" | respondida | "Para você", sempre. A rede está começando: quase ninguém tem conexões ainda, e abrir num feed vazio é o pior primeiro dia possível. Reavaliar quando a mediana de conexões por pessoa passar de ~10 |
| Q-024 | Abrir a caixa do sino deve zerar o contador, como abrir a página faz? | respondida | Sim. Abrir a caixa é olhar — se o contador continuasse, ele estaria mentindo. A lista permanece visível depois de marcada |
