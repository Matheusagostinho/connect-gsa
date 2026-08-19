# Spec: Apresentação viva e ajustes de interface

> feature: landing-e-ajustes
> status: implementada

## Contexto

Duas coisas de peso e um lote de acabamento.

**A que muda regra.** O perfil novo passa a **nascer visível no mapa**. Isso
inverte o P-011 e o AC-015, que diziam o contrário desde o primeiro dia — e a
razão deles era boa: um padrão pré-marcado em algo de localização é justamente o
que "opt-in consciente" existe para evitar. A decisão foi tomada com o dono do
produto, ciente do custo, e o que a atenua continua valendo: o mapa conhece
**apenas o município**, nunca endereço; a pessoa é avisada de que está no mapa; e
sair tem efeito imediato.

**A que dá cara ao produto.** A página de apresentação ganha uma nuvem de pixels
que deriva sozinha e se afasta do cursor — a linguagem do antigravity.google, de
onde o design system inteiro veio. Canvas próprio, sem biblioteca: o efeito é uma
malha de pontos e uma força de repulsão, e importar uma dependência de
partículas para isso pesaria mais que o recurso numa página que precisa carregar
rápido para quem chegou por um link de convite.

**O acabamento.** O indicador das abas do perfil passa a ocupar a aba inteira,
como já acontece no feed. No celular, o nome sobe para o lado do avatar. O avatar
ganha o anel em degradê da marca. "Avisos" sai do menu — fica para a v2, e a
rota continua existindo. E o botão de conectar do feed volta a responder: ele
não mostrava nada ao ser tocado porque a lista de caches invalidados não incluía
o feed, então o cartão nunca sabia que o pedido tinha sido enviado.

## Histórias

### US-053 — Entender a rede antes de entrar

Como quem recebeu um convite, quero uma página de entrada que mostre do que se
trata, para decidir se quero entrar.

#### AC-125 — A apresentação tem movimento próprio e responde ao cursor

- **Dado** que abro a página de apresentação num aparelho com ponteiro
- **Quando** movo o cursor sobre a área da nuvem
- **Então** os pontos se afastam dele, e continuam se movendo sozinhos quando paro

#### AC-126 — O movimento não atrapalha nem esquenta o aparelho

- **Dado** que pedi menos movimento no sistema, ou que a aba saiu de foco
- **Quando** a página está aberta
- **Então** a animação não roda — e a nuvem nunca captura clique dos botões

### US-054 — Aparecer no mapa desde o começo

Como embaixador, quero já constar no mapa ao concluir meu perfil, para a rede
não parecer vazia enquanto ninguém mexe em configurações.

#### AC-127 — Perfil novo nasce visível no mapa

- **Dado** que acabei de preencher meu perfil e não mexi em nada de privacidade
- **Quando** consulto minhas preferências
- **Então** eu **estou** visível no mapa, com a minha cidade — nunca com endereço

#### AC-128 — Quem entra é avisado de que está no mapa

- **Dado** que estou preenchendo meu perfil pela primeira vez
- **Quando** leio o formulário
- **Então** ele diz que eu vou aparecer no mapa pela cidade e que posso sair
  quando quiser — descobrir isso por acidente depois é o que não pode acontecer

### US-055 — Ver que o pedido de conexão foi enviado

Como embaixador, quero que o botão de conectar do feed responda ao toque, para
não ficar sem saber se o pedido saiu.

#### AC-129 — Conectar pelo cartão muda o cartão na hora

- **Dado** uma publicação de alguém com quem não estou conectado
- **Quando** toco em conectar
- **Então** o cartão passa a mostrar que o pedido foi enviado, sem eu precisar
  recarregar

### US-056 — Reconhecer onde estou no perfil

Como embaixador, quero enxergar de longe qual aba do perfil está aberta, para não
precisar procurar.

#### AC-130 — O indicador da aba ocupa a aba inteira

- **Dado** as abas do perfil
- **Quando** uma delas está aberta
- **Então** o indicador se estende por toda a largura dela, como no feed

## Fora de escopo

- Quadro de avisos: continua funcionando pelo endereço, só sai do menu. Volta na v2.
- Nuvem de pixels em outras telas: ela é da apresentação, e dentro do produto
  seria movimento competindo com conteúdo.
- Migrar quem já tem perfil para visível no mapa: a mudança vale para quem chegar
  depois. Ligar o mapa de quem já decidiu ficar fora seria desfazer a escolha
  dessa pessoa pelas costas.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-045 | O padrão do mapa passa a ser visível, invertendo P-011 e AC-015. Decidido com o dono do produto, ciente de que contraria o opt-in consciente. Continua valendo: só município, aviso no formulário, saída imediata | confirmada | P-011 reescrito com o motivo registrado, AC-015 invertido, e três testes acompanharam. Há teste provando que sair do mapa continua tirando a pessoa na hora — é o que sustenta o padrão |
| ASM-046 | A densidade da nuvem é proporcional à área, com teto. Contagem fixa vira travamento em tela grande e desperdício em celular | confirmada | `MAXIMO_PONTOS = 2200`, com o passo da malha crescendo quando a área pediria mais. `devicePixelRatio` limitado a 2 pelo mesmo motivo |
| ASM-047 | Quem já tem perfil não é migrado para visível: ligar o mapa de quem escolheu ficar fora seria desfazer a decisão da pessoa | confirmada | A migração altera só o DEFAULT da coluna. Nenhum UPDATE em linha existente, e o SQL diz por quê |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-029 | "Avisos" volta ao menu na v2, ou o quadro passa a viver dentro de outra seção? | respondida | Fica para decidir na v2. Por ora a ROTA continua viva e alcançável pela coluna de sugestões — tirar a rota junto quebraria os dois caminhos que sobraram |
| Q-030 | A nuvem deve reagir ao toque no celular, ou só ao ponteiro? Hoje só ao ponteiro — no celular o dedo cobre justamente o que aconteceria embaixo dele | respondida | Só ao ponteiro. `pointermove` cobre caneta e mouse; no celular a deriva própria continua acontecendo, e é o que se vê de qualquer forma |
