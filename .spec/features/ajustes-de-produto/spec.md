# Spec: Ajustes de produto

> feature: ajustes-de-produto
> status: rascunho

## Contexto

Correções e mudanças encontradas usando o produto de verdade. Duas eram defeitos
que só aparecem com dados reais, e o resto são decisões de identidade e de
endereço que ficaram melhores depois de ver a rede funcionando.

O defeito mais sério não parecia defeito: a coordenação via o botão de apagar em
publicação de outra pessoa, **com a mesma aparência do botão de apagar a própria**.
O poder de moderação existe e deve existir — o problema era ele se disfarçar de
"apagar meu post".

## Histórias

### US-028 — Distinguir apagar o que é meu de moderar o que é de outro

Como moderadora, quero que remover a publicação de outra pessoa seja visivelmente
diferente de apagar a minha, para não remover conteúdo alheio achando que é meu.

#### AC-078 — Só a minha publicação oferece o botão de apagar

- **Dado** que sou moderadora e vejo a publicação de outra pessoa
- **Quando** olho as ações disponíveis
- **Então** o botão de apagar a minha publicação não aparece ali — o que aparece é uma
  ação de moderação, identificada como tal

#### AC-079 — Quem não é moderador não vê ação nenhuma em publicação alheia

- **Dado** que sou embaixador comum
- **Quando** vejo a publicação de outra pessoa
- **Então** não há botão de apagar nem de moderar

### US-029 — Ler e abrir links publicados

Como embaixador, quero que um endereço colado numa publicação vire link clicável
sem estourar o cartão, para poder abrir o que compartilharam.

#### AC-080 — O endereço vira link que abre em outra aba

- **Dado** uma publicação com um endereço no texto
- **Quando** ela aparece no feed
- **Então** o endereço é um link clicável, que abre em nova aba

#### AC-081 — Endereço comprido não estoura o cartão

- **Dado** uma publicação com um endereço de centenas de caracteres, sem espaços
- **Quando** ela aparece no feed
- **Então** o que se lê é uma versão curta — e o destino completo continua sendo o
  endereço inteiro

#### AC-082 — Texto continua sendo texto

- **Dado** uma publicação com algo que parece marcação HTML
- **Quando** ela aparece na tela
- **Então** aparece como texto, sem virar elemento — a sanitização do servidor não é a
  única defesa

### US-030 — Reconhecer as reações em qualquer aparelho

Como embaixador, quero que as reações apareçam igual em qualquer sistema, para não
ver quadrados vazios no lugar delas.

#### AC-083 — As reações usam ícones desenhados, não emoji

- **Dado** um sistema sem fonte de emoji instalada
- **Quando** olho as reações
- **Então** vejo o ícone e o rótulo de cada uma, e não caracteres não representáveis

## Fora de escopo

- Prévia do conteúdo do link (cartão com título e imagem do destino).
- Reconhecer menções a pessoas ou marcações de assunto no texto.
- Histórico de moderação: quem removeu o quê e quando.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-027 | Moderação continua podendo remover publicação alheia; o que muda é só a aparência e a confirmação | aberta | — |
| ASM-028 | Ícone desenhado comunica a reação tão bem quanto emoji, desde que o rótulo esteja junto | aberta | — |
| ASM-029 | O endereço de perfil `/perfil/{apelido}` é mais legível que `/e/{apelido}` e vale a mudança agora, enquanto quase nenhum link circulou | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-019 | Remoção por moderação deve avisar o autor da publicação? | aberta | — |
| Q-020 | A rede deve mostrar prévia do link (título e imagem do destino)? Exigiria buscar a página, o que expõe o servidor a endereços arbitrários | aberta | — |
