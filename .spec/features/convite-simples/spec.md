# Spec: Convite simples e apresentação animada

> feature: convite-simples
> status: implementada

## Contexto

O convite era **invisível para quase todo mundo e impossível de ditar**. Duas
mudanças, e as duas mexem em regra.

**Quem convida.** Só coordenação e moderação podiam gerar convite, e a maioria
das pessoas nunca via o botão. Agora **todo embaixador convida**, com teto
mensal — quem conhece outro participante do programa é quem está nele, não a
coordenação. O teto existe para uma conta comprometida não virar torneira.

**O código.** Eram 32 caracteres hexadecimais: impossível de ditar por telefone e
feio num grupo de mensagens. Passa a ter **8 caracteres** de um alfabeto sem
letras ambíguas, e o link fica `/convite/ABC5EK9M`.

Oito, e não cinco. O convite é o **único portão** da rede, e a diferença é de
33 mil vezes: com 5 caracteres e cinquenta convites ativos, um atacante acerta um
em cerca de dois meses a dez mil tentativas por dia; com 8, leva milhares de
anos. E como o banco guarda só o hash (P-009), 5 caracteres seriam quebrados por
força bruta em segundos num vazamento — 8 continuam custosos. A diferença para
quem digita é uma sílaba.

**A página de convite** deixa de pedir que a pessoa digite o que já está no link:
ela diz quem convidou e leva direto ao login. O código fica guardado no
navegador para sobreviver ao vaivém do provedor social.

Junto vai o acabamento da apresentação — a nuvem de pixels passa a ser o fundo da
página inteira, e o degradê de "embaixadores" se move — e o pino do mapa deixa de
carregar o nome da cidade, que agora aparece ao passar o mouse ou ao clicar.

## Histórias

### US-057 — Convidar quem eu conheço do programa

Como embaixador, quero gerar um convite para alguém que conheço do programa, sem
depender da coordenação.

#### AC-131 — Todo embaixador gera convite, com teto

- **Dado** que sou embaixador comum
- **Quando** peço um convite
- **Então** ele é criado — e depois do meu teto mensal, um novo pedido é recusado
  com o motivo

#### AC-132 — Coordenação e moderação não têm teto

- **Dado** que sou da coordenação
- **Quando** gero convites acima do teto de um embaixador
- **Então** todos são criados

### US-058 — Ditar e digitar um convite sem erro

Como embaixador, quero um código curto e sem letras que se confundem, para
conseguir passá-lo por telefone.

#### AC-133 — O código tem oito caracteres, sem letras ambíguas

- **Dado** um convite recém-criado
- **Quando** olho o código
- **Então** ele tem oito caracteres, e nenhum deles é I, L, O ou U — que se
  confundem com 1, 0 e V ao ditar

#### AC-134 — O link leva o código no caminho

- **Dado** um convite recém-criado
- **Quando** olho o endereço de compartilhamento
- **Então** ele é `/convite/CODIGO`, e abre a página já com o convite reconhecido

### US-059 — Saber quem me convidou

Como quem recebeu um convite, quero ver quem me convidou antes de entrar, para
reconhecer que o convite é legítimo.

#### AC-135 — A página do convite diz quem convidou

- **Dado** que abro um link de convite válido
- **Quando** a página carrega
- **Então** ela me cumprimenta dizendo quem me convidou e me leva ao login

#### AC-136 — Convite inválido não vira oráculo

- **Dado** um código que não existe, já usado ou expirado
- **Quando** abro o link
- **Então** recebo a mesma recusa nos três casos, e nenhum nome é revelado

#### AC-137 — O código sobrevive ao login social

- **Dado** que abri um convite válido e fui para o login
- **Quando** volto do provedor social
- **Então** o convite ainda está comigo — o vaivém não o perde

### US-060 — Ler o mapa sem poluição

Como embaixador, quero ver os rostos no mapa sem o nome da cidade em cima deles.

#### AC-138 — O pino mostra rostos e a contagem, não o nome

- **Dado** uma cidade com mais gente do que cabe no pino
- **Quando** olho o mapa
- **Então** vejo até três rostos e quantas pessoas faltam — e o nome da cidade só
  ao passar o mouse ou ao abrir

## Fora de escopo

- Convite nominal (para um e-mail específico): continua sendo um código que
  qualquer pessoa com o link usa uma vez.
- Histórico de quem convidou quem na interface. O vínculo já existe no banco.
- Revogar um convite emitido.
- Ajustar o teto por pessoa: ele é o mesmo para todo embaixador.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-048 | Oito caracteres em alfabeto de 32 sem I/L/O/U. Decidido com o dono do produto sobre os números: 5 caracteres dariam um acerto a cada ~670 mil tentativas com 50 convites ativos | confirmada | `INVITE_ALPHABET` com 32 símbolos, `randomInt` do `node:crypto`. Há teste provando que todo o alfabeto sai no sorteio — `randomBytes` com resto por 32 pareceria equivalente e enviesaria no dia em que alguém tirasse uma letra |
| ASM-049 | Teto de 5 convites por 30 dias para embaixador; coordenação e moderação sem teto. O teto existe para uma conta comprometida não virar torneira | confirmada | `INVITE_QUOTA` no pacote compartilhado, verificado no serviço. O CASL ficou de fora porque decide sobre o que já está em memória, e contar convites exige ir ao banco |
| ASM-050 | O código fica no `localStorage` até o cadastro terminar. É o mesmo código que já está na barra de endereço — guardá-lo não expõe nada que a pessoa não tenha | confirmada | Validado na leitura também: armazenamento é escrita livre para qualquer script da origem, e valor inventado não pode virar requisição. Apagado assim que existe sessão |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-031 | O teto deve contar convites CRIADOS ou convites USADOS? Hoje conta criados, o que é mais restritivo | respondida | Criados. Contar usados deixaria alguém gerar cem links de uma vez e espalhá-los, e o teto só apareceria depois que o estrago já estivesse na rua |
| Q-032 | Convites antigos, de 32 caracteres, devem continuar valendo? | respondida | Não. O formato é validado antes do banco, e um código de 32 caracteres deixa de passar. A rede não está no ar, então não há convite antigo em circulação — o endereço `?c=` continua sendo lido pela página por precaução |
