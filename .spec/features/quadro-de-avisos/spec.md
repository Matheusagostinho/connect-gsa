# Spec: Quadro de avisos

> feature: quadro-de-avisos
> status: rascunho

## Contexto

A rede tem feed, mas não tem voz institucional. Quando a coordenação precisa
comunicar algo — prazo de entrega, encontro marcado, mudança de regra —, o recado
vira mais um post disputando espaço com os demais e some na rolagem.

O quadro de avisos é separado do feed **de propósito**: comunicado oficial não
deveria competir por atenção com publicação pessoal, nem ser ordenado por
engajamento. Ele é cronológico e só a coordenação publica.

O risco óbvio do desenho é o inverso: um quadro que ninguém visita é um quadro
morto. Por isso o aviso mais recente também aparece no topo do feed — o lugar
onde as pessoas já estão.

## Histórias

### US-034 — Comunicar oficialmente

Como coordenação do programa, quero publicar um comunicado que não se confunda com
publicação pessoal, para que a rede tenha um canal institucional confiável.

#### AC-090 — Só a coordenação publica no quadro

- **Dado** que sou embaixador comum
- **Quando** tento publicar um aviso
- **Então** a rede recusa por falta de permissão; a mesma ação feita pela coordenação
  publica normalmente

#### AC-091 — O aviso não se mistura ao feed comum

- **Dado** um aviso publicado pela coordenação
- **Quando** o feed é montado
- **Então** o aviso não aparece entre as publicações comuns — ele vive no quadro

### US-035 — Acompanhar os comunicados

Como embaixador, quero ver os avisos do programa num lugar só, para não depender de
ter passado pelo feed na hora certa.

#### AC-092 — Vejo os avisos do mais recente para o mais antigo

- **Dado** vários avisos publicados em momentos diferentes
- **Quando** abro o quadro
- **Então** eles aparecem em ordem cronológica invertida — sem ranking por engajamento,
  porque comunicado não disputa atenção

#### AC-093 — O aviso mais recente aparece no topo do feed

- **Dado** um aviso publicado nos últimos dias
- **Quando** abro o feed
- **Então** ele aparece em destaque no topo, identificado como aviso oficial, com um
  caminho para o quadro completo

#### AC-094 — Consigo responder a um aviso

- **Dado** um aviso do programa
- **Quando** reajo ou comento nele
- **Então** funciona como em qualquer publicação — dúvida sobre comunicado precisa de
  lugar para ser feita

### US-036 — Corrigir o que foi comunicado

Como coordenação, quero remover um aviso, para que informação errada não fique no ar.

#### AC-095 — A coordenação remove um aviso; embaixador comum não

- **Dado** um aviso publicado
- **Quando** um embaixador comum tenta removê-lo
- **Então** a rede recusa; a mesma ação feita pela coordenação remove

## Fora de escopo

- Editar aviso já publicado (a mesma pergunta em aberto dos posts, Q-007).
- Agendar publicação para uma data futura.
- Notificar todo mundo quando sai um aviso — hoje a notificação cobre reação,
  comentário e conexão; aviso para a rede inteira é outro desenho.
- Fixar mais de um aviso, ou escolher qual fica fixo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-030 | Moderação e administração publicam avisos; embaixador comum, não. É a mesma divisão que já vale para convites | aberta | — |
| ASM-031 | Um aviso deixa de ser destaque no feed depois de 14 dias. Aviso velho no topo vira ruído e ensina a ignorar o espaço | aberta | — |
| ASM-032 | Avisos aceitam reação e comentário. Comunicado sem lugar para dúvida empurra a dúvida para fora da rede | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-021 | Um aviso novo deve notificar toda a rede? Hoje ninguém é avisado — só quem abrir o feed ou o quadro descobre | aberta | — |
| Q-022 | A coordenação deveria poder fixar um aviso específico, em vez de ser sempre o mais recente? | aberta | — |
