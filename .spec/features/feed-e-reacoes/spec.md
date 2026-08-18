# Spec: Feed e reações

> feed-e-reacoes
> status: rascunho

## Contexto

Com o acesso e o perfil no ar, a rede ainda não tem o que a torna uma rede: gente
publicando e reagindo ao que os outros publicam. Esta feature entrega o feed, o
envio de imagens e um conjunto de reações **próprio** — desenhado para uma rede de
conexão, não de aplauso.

A reação principal é **Decolou** (🚀). As demais existem porque numa rede de
embaixadores nem toda resposta é elogio: **Aprendi** reconhece conteúdo que ensina,
**Bora junto** e **Posso ajudar** sinalizam intenção de colaborar, e **Respeito**
reconhece esforço. As duas de intenção são o diferencial: elas não medem
popularidade, medem disposição de trabalhar junto.

O ranking do feed foi informado pelo código aberto do X (`xai-org/x-algorithm`),
mas **não copia os pesos de lá**: o próprio código avisa que aqueles números
multiplicam probabilidades previstas por um modelo, não contagens brutas. O que
trouxemos foi o raciocínio — diversidade de autor, suavização de início frio,
sinal negativo com peso alto, e ação de esforço valendo mais que ação de toque.

## Histórias

### US-010 — Publicar o que estou fazendo

Como embaixador, quero publicar um texto com uma imagem, para que os outros
participantes saibam no que estou trabalhando.

#### AC-023 — Publico texto e o post aparece no feed

- **Dado** que estou autenticado e com o perfil completo
- **Quando** escrevo um texto e publico
- **Então** o post aparece no meu feed, com meu nome e o horário da publicação

#### AC-024 — Texto colado com HTML não vira código na tela

- **Dado** que colei `<script>alert(1)</script>Olá` no campo do post
- **Quando** publico
- **Então** o que aparece é texto inofensivo (a limpeza acontece no servidor, antes de gravar)

#### AC-025 — Post vazio e post longo demais são recusados

- **Dado** que o campo está vazio, ou passa do limite de caracteres
- **Quando** tento publicar
- **Então** a rede recusa e me diz o que está errado, sem criar post nenhum

### US-011 — Enviar imagens sem entregar onde eu estava

Como embaixador, quero anexar uma foto ao meu post e trocar minha foto de perfil,
para que a rede fique visual — sem que isso revele minha localização.

#### AC-026 — A localização embutida na foto é descartada

- **Dado** que envio uma foto tirada no celular, com coordenadas de GPS gravadas nela
- **Quando** a imagem é aceita e passa a ser exibida
- **Então** o arquivo guardado não contém nenhum dado de localização, nem qualquer outro
  metadado da câmera

#### AC-027 — Arquivo que não é imagem é recusado

- **Dado** que envio um arquivo executável renomeado para `.jpg`
- **Quando** a rede analisa o envio
- **Então** ele é recusado (a checagem olha o conteúdo do arquivo, não a extensão nem o
  tipo declarado pelo navegador)

#### AC-028 — Arquivo grande demais é recusado

- **Dado** que envio uma imagem acima do limite de tamanho
- **Quando** a rede analisa o envio
- **Então** ela recusa antes de guardar qualquer coisa

#### AC-029 — Troco minha foto de perfil

- **Dado** que estou autenticado
- **Quando** envio uma nova foto de perfil
- **Então** ela passa a aparecer no meu perfil, redimensionada para o tamanho de exibição

### US-012 — Reagir com o que eu realmente quis dizer

Como embaixador, quero escolher entre reações com significados distintos, para que
minha resposta diga mais do que "gostei".

#### AC-030 — Reajo a um post e a contagem daquela reação sobe

- **Dado** um post de outro embaixador sem nenhuma reação minha
- **Quando** escolho "Decolou"
- **Então** o post passa a mostrar a minha reação e a contagem de "Decolou" sobe em um

#### AC-031 — Trocar de reação substitui a anterior, não soma

- **Dado** que já reagi com "Decolou" a um post
- **Quando** escolho "Respeito" no mesmo post
- **Então** minha reação passa a ser "Respeito", "Decolou" volta a zero e o total continua
  sendo uma reação minha

#### AC-032 — Reagir de novo com a mesma reação desfaz

- **Dado** que reagi com "Aprendi" a um post
- **Quando** escolho "Aprendi" outra vez
- **Então** minha reação é removida e a contagem volta ao que era

### US-013 — Conversar sobre o que foi publicado

Como embaixador, quero comentar num post, para que a rede gere conversa e não só
aplauso.

#### AC-033 — Comento e o comentário aparece

- **Dado** um post no feed
- **Quando** escrevo um comentário e envio
- **Então** ele aparece na conversa daquele post, com meu nome, e o contador de comentários
  do post sobe

#### AC-034 — Só o autor do comentário pode apagá-lo

- **Dado** um comentário escrito por outra pessoa
- **Quando** tento apagá-lo
- **Então** a rede recusa por falta de permissão; a moderação do programa, essa, consegue

### US-014 — Ver primeiro o que me interessa

Como embaixador, quero um feed que não seja só ordem cronológica, para que conteúdo
bom não se perca e quem posta muito não tome a tela.

#### AC-035 — Post com mais engajamento aparece acima de post parado da mesma hora

- **Dado** dois posts publicados no mesmo momento, um com várias reações e comentários e
  outro sem nenhum
- **Quando** o feed é montado
- **Então** o mais engajado aparece antes

#### AC-036 — Post recente supera post antigo com engajamento parecido

- **Dado** dois posts com engajamento parecido, um de agora e outro de três dias atrás
- **Quando** o feed é montado
- **Então** o recente aparece antes

#### AC-037 — Quem posta muito não ocupa a tela inteira

- **Dado** que um mesmo embaixador publicou os cinco posts mais engajados do dia
- **Quando** o feed é montado
- **Então** os posts dele são espalhados, e cada post seguinte do mesmo autor pesa menos
  que o anterior, até um piso

#### AC-038 — Post novo não é enterrado por falta de audiência

- **Dado** um post publicado há minutos, ainda sem nenhuma reação
- **Quando** o feed é montado
- **Então** ele não fica abaixo de um post antigo com engajamento igualmente baixo — a nota
  de um post com pouquíssima audiência é puxada para a média, não tratada como zero

#### AC-039 — O feed vem em páginas, sem repetir nem pular post

- **Dado** que percorri a primeira página do feed
- **Quando** peço a próxima
- **Então** recebo posts seguintes, sem repetir os que já vi e sem pular nenhum

### US-015 — Sair da minha conta

Como embaixador, quero sair da rede no dispositivo em que estou, para que minha
conta não fique aberta num computador compartilhado do laboratório.

#### AC-040 — Saio e a sessão deixa de valer

- **Dado** que estou autenticado
- **Quando** escolho sair
- **Então** volto para a tela de entrada, e uma nova requisição a uma área restrita responde
  que preciso me autenticar

## Fora de escopo

- Quadro de avisos (posts oficiais do programa) — o campo `kind` já nasce no modelo.
- Gamificação: pontos, badges e ranking.
- Busca no diretório e mapa.
- Notificação de reação ou comentário.
- Vídeo. Só imagem nesta fatia.
- Sugerir conexão a partir de "Bora junto" e "Posso ajudar" — o sinal fica registrado
  desde já, e a mecânica de conexão vem com a feature de conexões.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-008 | Uma reação por pessoa por post, trocável, é o modelo certo — força a pessoa a dizer o que realmente quis dizer e mantém cada sinal limpo | confirmada | Confirmada pelo dono do produto em 2026-08-18 |
| ASM-009 | O feed mostra a rede inteira, com proximidade (conexão, instituição, cidade) como impulso — esconder gente numa rede de centenas derrotaria o propósito de conectar | confirmada | Confirmada pelo dono do produto em 2026-08-18 |
| ASM-010 | Uma imagem por post basta nesta fatia | aberta | — |
| ASM-011 | Limite de 5 MB por imagem e 1200px no maior lado atende ao uso e cabe na cota gratuita | aberta | — |
| ASM-012 | O envio passa pela API em vez de ir direto ao bucket por URL assinada: é mais lento, mas permite validar o conteúdo e remover metadados ANTES de gravar. Com o volume do MVP, o custo não se justifica ao contrário | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-006 | "Bora junto" e "Posso ajudar" devem notificar o autor do post na hora? Sem isso, o sinal de intenção morre sem virar conversa | aberta | — |
| Q-007 | Post pode ser editado depois de publicado, ou só apagado? Edição exige histórico para não reescrever o que os outros já reagiram | aberta | — |
| Q-008 | Quanto tempo guardamos imagem de post apagado? Apagar do bucket na hora é mais limpo; manter um período protege de exclusão acidental | aberta | — |
