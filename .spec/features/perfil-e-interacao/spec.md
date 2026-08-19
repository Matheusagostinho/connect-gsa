# Spec: Perfil estilo X e reação por pressionar

> feature: perfil-e-interacao
> status: implementada

## Contexto

Quatro problemas encontrados usando o produto no computador, e uma mudança de
interação pedida.

O mais grave é estrutural: **o mapa não passa pela moldura do aplicativo**. Ele
desenha a própria navegação lateral num contêiner sem a largura máxima das outras
telas, e a coluna sai 80px fora de lugar. Não é ajuste de classe — é a regra de que
existe *uma* estrutura de navegação, com dois arranjos, tendo sido furada. A
correção devolve o mapa para dentro do `AppShell`, que ganha um modo imersivo.

Junto vêm: o modal da cidade grudado numa borda (o `margin: auto` do `dialog` foi
morto por uma classe de margem), o onboarding fora do padrão visual, e o perfil —
que não mostrava publicação nenhuma e existia duplicado em dois arquivos que já
tinham divergido entre si.

Sobre a reação: o rótulo no cartão custa largura e repete o que o ícone já diz.
Ela passa a ser só o ícone, e a fileira das outras abre ao **pressionar e segurar**,
como no Facebook. Isso cria três armadilhas que decidem se o gesto funciona ou
irrita: rolar a tela não pode abrir a fileira, o menu nativo do sistema não pode
aparecer no meio do gesto, e o teclado — que não tem "segurar" — precisa de um
caminho próprio.

## Histórias

### US-043 — Navegar sem a interface mudar de lugar

Como embaixador, quero que a navegação fique no mesmo lugar em todas as telas,
para não ter que reencontrá-la a cada seção.

#### AC-104 — A navegação lateral é a mesma em toda tela autenticada

- **Dado** que abro o feed e depois o mapa no computador
- **Quando** comparo a coluna de navegação
- **Então** ela ocupa a mesma posição e a mesma largura nas duas — porque é a mesma
  moldura, não duas cópias

#### AC-105 — O modal da cidade abre centralizado no computador

- **Dado** que toco no pino de uma cidade numa tela larga
- **Quando** o modal abre
- **Então** ele fica centralizado na área visível, e não colado numa das bordas

### US-044 — Completar o perfil sem sair do produto

Como embaixador, quero que editar meu perfil aconteça dentro do aplicativo, para
não parecer que fui jogado num formulário solto.

#### AC-106 — Editar o perfil acontece dentro da moldura

- **Dado** que meu perfil já está completo e escolho editá-lo
- **Quando** a tela abre
- **Então** ela tem a navegação e o cabeçalho das outras telas

#### AC-107 — O primeiro preenchimento não oferece navegação que não leva a lugar nenhum

- **Dado** que acabei de entrar e ainda não completei o perfil
- **Quando** a tela de onboarding abre
- **Então** ela NÃO mostra a navegação entre seções — toda outra seção me devolveria
  para cá, e navegação que só recusa é pior que navegação nenhuma

### US-045 — Ver o perfil de alguém com o que a pessoa publicou

Como embaixador, quero abrir um perfil e ver quem a pessoa é e o que ela publicou
no mesmo lugar, para decidir se quero me conectar.

#### AC-108 — O próprio perfil mostra minhas publicações

- **Dado** que publiquei alguma coisa
- **Quando** abro meu próprio perfil
- **Então** vejo minhas publicações ali, como vejo nas dos outros

#### AC-109 — O perfil mostra quantas conexões e publicações a pessoa tem

- **Dado** um perfil de embaixador
- **Quando** ele é servido pela API
- **Então** ele traz a contagem de conexões e de publicações — e a de conexões conta
  apenas laços aceitos, nunca pedidos pendentes

#### AC-110 — Perfil próprio e de terceiro usam a mesma apresentação

- **Dado** o meu perfil e o de outra pessoa
- **Quando** comparo as duas telas
- **Então** a identidade é montada pelo mesmo componente — o que muda é a ação
  disponível, não o desenho

### US-046 — Reagir com um toque e escolher segurando

Como embaixador, quero reagir com um toque e ver as outras reações segurando o
botão, para o gesto ser o mesmo que já uso em outras redes.

#### AC-111 — O cartão mostra só o ícone da reação

- **Dado** um cartão de publicação
- **Quando** olho a barra de reações
- **Então** vejo o ícone sem rótulo escrito ao lado — mas o botão continua tendo nome
  acessível, para quem lê por leitor de tela

#### AC-112 — Pressionar e segurar abre as outras reações

- **Dado** que pressiono o botão de reação e seguro
- **Quando** passa o tempo de espera
- **Então** a fileira das cinco reações aparece, sem que a reação tenha sido aplicada

#### AC-113 — Rolar a tela não abre a fileira

- **Dado** que encosto o dedo no botão e arrasto para rolar o feed
- **Quando** o ponteiro se desloca além do limiar
- **Então** a espera é cancelada e nada abre — senão rolar o feed viraria uma
  loteria de menus abertos

#### AC-114 — O teclado alcança as outras reações

- **Dado** que estou navegando por teclado, onde "segurar" não existe
- **Quando** uso a tecla de seta para cima no botão de reação
- **Então** a fileira abre, e o botão anuncia que existe algo a abrir

## Fora de escopo

- Foto de capa enviada pela pessoa: a faixa do perfil é gerada, não carregada.
  Armazenamento de imagem grande custa cota, e a rede ainda não está no ar.
- Abas de "Respostas" e "Mídia" no perfil, que o X tem: não temos volume para elas.
- Paginação das publicações do perfil (continua em 30, como já era).
- Tornar a coluna da direita configurável pela pessoa.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-037 | O mapa ocupa a coluna de conteúdo da mesma grade das outras telas, e não sangra até a borda da janela. Decidido com o usuário: a navegação idêntica vale mais que alguns pixels de mapa | confirmada | Medido: coluna de navegação em x=112 tanto no feed quanto no mapa. Um fio lateral marca o limite da coluna — sem ele o mapa, cinza como o fundo, parecia vazar |
| ASM-038 | A coluna da direita aparece a partir de 1280px e é montada só com dados que a API já serve — sugestões do diretório, aviso mais recente e link de convite | confirmada | Entregue com sugestões do diretório e o aviso mais recente. O convite ficou de fora, e isso é um recuo consciente: gerar um convite é ação de coordenação, e um bloco que a maioria não pode usar é ruído na coluna |
| ASM-039 | 450ms é o tempo de espera do pressionar e segurar. Abaixo disso, um toque comum dispara sem querer; acima, o gesto parece travado | confirmada | `ESPERA_MS = 450`, com limiar de arrasto de 10px cancelando. Verificado no navegador: segurar abre, arrastar não |
| ASM-040 | A faixa do perfil é um gradiente derivado do identificador da pessoa — estável entre visitas, sem upload e sem custo de armazenamento | confirmada | Hash em 32 bits, resto por 360 só no fim. A primeira versão aplicava o resto a cada passo e dois ids diferentes davam o mesmo tom — o teste pegou |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-025 | O toque curto deve aplicar "Decolou" ou abrir a fileira para quem ainda não reagiu? Hoje aplica, seguindo o caminho de um toque | respondida | Aplica. A ação mais comum não pode ser a mais cara, e agora existe um gesto dedicado para escolher |
| Q-026 | A coluna da direita deve aparecer também no perfil e no diretório, ou só no feed? | respondida | Só no feed. No diretório ela repetiria o próprio conteúdo da página, e no perfil disputaria atenção com a pessoa que se foi ver |
