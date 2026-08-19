# Spec: Navegação e notificações

> feature: navegacao-e-notificacoes
> status: rascunho

## Contexto

A rede cresceu para cinco seções — feed, diretório, mapa, conexões e perfil — e a
navegação continuou sendo uma fileira de links no topo, pensada quando havia duas.
No celular ela disputa espaço com a marca e o menu da conta; no computador
desperdiça a largura que sobra dos lados.

Junto vem o buraco que sustenta o resto: **ninguém fica sabendo de nada**. Quem
recebe um pedido de conexão só descobre se abrir a página de conexões. Uma reação
"Bora junto" — o sinal que diferencia esta rede de uma rede de aplauso — morre sem
virar conversa, porque o autor do post nunca soube que alguém se ofereceu.

Notificação aqui **não precisa de tabela própria**. Numa rede de centenas de
pessoas, o custo de manter registros duplicados e sincronizados supera o de
consultar o que já existe: pedidos, reações e comentários estão no banco, com data.
Basta uma marca de "vi até aqui" no usuário.

## Histórias

### US-023 — Alcançar qualquer seção sem procurar

Como embaixador, quero os destinos principais sempre à mão, para circular pela rede
sem voltar ao topo da página.

#### AC-061 — No computador, os destinos ficam fixos na lateral

- **Dado** que estou numa tela larga
- **Quando** abro qualquer seção da rede
- **Então** vejo a lista de destinos numa coluna à esquerda, que continua visível
  enquanto eu rolo o conteúdo

#### AC-062 — No celular, os destinos ficam na barra inferior

- **Dado** que estou numa tela estreita
- **Quando** abro qualquer seção da rede
- **Então** os destinos aparecem numa barra fixa na parte de baixo, ao alcance do
  polegar, e notificações e perfil ficam numa barra no topo

#### AC-063 — A seção em que estou é identificável

- **Dado** que estou no mapa
- **Quando** olho a navegação
- **Então** o item do mapa está marcado como o atual, tanto visualmente quanto para
  quem usa leitor de tela

### US-024 — Ver o mapa com o espaço que ele merece

Como embaixador, quero o mapa ocupando a tela inteira, para enxergar o país sem
espremer o país numa caixa.

#### AC-064 — O mapa preenche a área disponível

- **Dado** que abro o mapa
- **Quando** a tela termina de montar
- **Então** o mapa ocupa toda a área útil — sem margens laterais de conteúdo — e a
  navegação continua acessível por cima dele

### US-025 — Saber o que aconteceu comigo

Como embaixador, quero ver quem pediu conexão, quem reagiu e quem comentou nas
minhas publicações, para responder em vez de descobrir por acaso.

#### AC-065 — Vejo pedido de conexão, reação e comentário num lugar só

- **Dado** que alguém pediu conexão comigo, alguém reagiu a um post meu e alguém
  comentou nele
- **Quando** abro minhas notificações
- **Então** vejo os três, do mais recente para o mais antigo, com quem fez e quando

#### AC-066 — O contador mostra quantas eu ainda não vi

- **Dado** que três coisas aconteceram desde a última vez que olhei
- **Quando** estou em qualquer tela da rede
- **Então** a navegação indica três notificações não lidas

#### AC-067 — Depois de olhar, param de contar como novas

- **Dado** que tenho notificações não lidas
- **Quando** abro a tela de notificações
- **Então** o contador zera, e o que já existia continua na lista — visto não é apagado

#### AC-068 — Não sou notificado do que eu mesmo fiz

- **Dado** que reagi e comentei numa publicação minha
- **Quando** abro minhas notificações
- **Então** nada disso aparece

## Fora de escopo

- Notificação por e-mail ou push. Só dentro da aplicação.
- Preferências de quais notificações receber.
- Marcar uma notificação específica como lida — o "visto" é do conjunto.
- Notificar menção a outra pessoa: menções ainda não existem.
- Quadro de avisos, gamificação e tempo real — cada um é uma fatia própria.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-019 | Derivar notificação do que já está no banco é melhor que uma tabela própria nesta escala: elimina duplicação e o risco de os dois lados divergirem. Se a rede crescer muito além de alguns milhares, isso vira uma consulta cara e o desenho precisa mudar | aberta | — |
| ASM-020 | Uma marca única de "vi até aqui" basta; não é preciso saber quais notificações específicas foram lidas | aberta | — |
| ASM-021 | Cinco destinos (feed, diretório, mapa, conexões, perfil) cabem numa barra inferior de celular sem virar sopa de ícones | aberta | — |
| ASM-022 | Notificação só olha os últimos 30 dias — mais que isso deixa de ser notícia e vira histórico | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-013 | "Bora junto" e "Posso ajudar" merecem destaque na lista de notificações, por carregarem intenção de colaborar? | aberta | — |
| Q-014 | O contador deve ter teto visual (ex.: "9+") ou mostrar o número exato por maior que seja? | aberta | — |
| Q-015 | Quem entra pela primeira vez deve ver como não lido tudo o que já aconteceu, ou começar zerado? | aberta | — |
