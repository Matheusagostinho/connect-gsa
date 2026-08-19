# Spec: Refino de interface e identidade editável

> feature: refino-de-interface
> status: implementada

## Contexto

Lote de ajustes vindos do uso, mais duas mudanças de produto que mexem em regra e
não só em desenho.

**As de regra.** O feed passa a favorecer bem mais o recém-publicado: a meia-vida
da recência cai de doze para duas horas. O ranking continua existindo — afinidade,
esforço, diversidade de autor —, mas o que acabou de ser escrito sobe ao topo, que
é o que se espera de um feed. E o **nome de usuário passa a ser editável**, o que
contraria a decisão original de derivá-lo do nome uma vez e nunca reescrever.
Aquela decisão tinha razão: um endereço que já circulou em conversa e deixa de
funcionar é pior que um endereço desatualizado. Como a troca foi pedida, ela vem
com as duas defesas que evitam o estrago — **o endereço antigo continua
respondendo** e a troca tem intervalo mínimo.

**As de desenho.** Uma largura só para todas as telas (quatro estavam mais
estreitas que as outras duas). Publicação deixa de ser cartão e vira conteúdo
separado por fio. O quadro de avisos sai do feed. A caixa de escrever fica sem
moldura. Puxar para atualizar, e um botão de publicar que aparece ao rolar. As
reações ganham resposta ao passar o mouse, e "Decolou" ganha um foguete que
decola. O diretório esconde a lista de habilidades atrás de um painel de filtros
— no celular, ela ocupava meia tela antes da primeira pessoa aparecer. E
"Conexões" sai da navegação: ela pertence ao perfil, e o contador de conexões de
lá é o caminho natural.

## Histórias

### US-047 — Ver primeiro o que acabou de ser publicado

Como embaixador, quero que o feed mostre no topo o que acabou de ser escrito,
para não abrir a rede e encontrar o mesmo assunto de ontem.

#### AC-115 — O recém-publicado vence o engajado de horas atrás

- **Dado** um post de agora sem reação nenhuma e um post de seis horas atrás com
  muito engajamento
- **Quando** o feed é ordenado
- **Então** o de agora aparece antes

#### AC-116 — Puxar a tela para baixo recarrega o feed

- **Dado** que estou no topo do feed no celular
- **Quando** puxo a tela para baixo além do limiar e solto
- **Então** o feed é recarregado

### US-048 — Escolher meu endereço na rede

Como embaixador, quero poder trocar meu nome de usuário, para o endereço do meu
perfil ser o que eu escolhi.

#### AC-117 — O nome de usuário é único e não colide com rota

- **Dado** um nome de usuário já em uso, ou igual a uma palavra reservada do site
- **Quando** tento salvá-lo
- **Então** a troca é recusada com o motivo

#### AC-118 — O endereço antigo continua respondendo

- **Dado** que troquei meu nome de usuário
- **Quando** alguém abre o endereço antigo, que já circulou em conversa
- **Então** ele ainda encontra meu perfil

#### AC-119 — A troca tem intervalo mínimo

- **Dado** que troquei meu nome de usuário há poucos dias
- **Quando** tento trocar de novo
- **Então** a troca é recusada — cada troca deixa para trás um endereço que a rede
  precisa continuar respondendo, e sem intervalo isso não tem fim

### US-049 — Guardar meus links das redes que uso

Como embaixador, quero campos prontos para GitHub, portfólio, LinkedIn, Instagram
e TikTok, para não ter que inventar o rótulo de cada um.

#### AC-120 — Os cinco campos conhecidos são guardados e devolvidos

- **Dado** que preencho o campo do GitHub e o do portfólio
- **Quando** salvo o perfil
- **Então** os dois voltam associados aos rótulos certos, e os campos que deixei
  em branco não viram link vazio

### US-050 — Reconhecer o que dá para tocar

Como embaixador, quero que a interface responda ao mouse e diga o que é clicável,
para não ter que descobrir por tentativa.

#### AC-121 — As reações respondem ao passar o mouse

- **Dado** que passo o mouse sobre uma reação
- **Quando** o ponteiro entra
- **Então** ela responde com movimento — exceto para quem pediu menos movimento no
  sistema

#### AC-122 — O contador de conexões do perfil é um link

- **Dado** o perfil de alguém
- **Quando** olho o número de conexões
- **Então** ele é um link, e se anuncia como tal

### US-051 — Compartilhar meu perfil

Como embaixador, quero compartilhar o endereço do meu perfil, para levar gente do
programa para a rede.

#### AC-123 — O perfil oferece compartilhar o próprio endereço

- **Dado** que estou num perfil
- **Quando** procuro como compartilhá-lo
- **Então** há um botão que copia ou abre a folha de compartilhamento do aparelho

### US-052 — Navegar sem destino que não é seção

Como embaixador, quero que a navegação liste só as seções da rede, para ela não
crescer com tudo que existe.

#### AC-124 — Conexões sai da navegação e vive no perfil

- **Dado** a navegação lateral e a inferior
- **Quando** olho os destinos
- **Então** "Conexões" não está lá — e o perfil leva até ela

## Fora de escopo

- Histórico completo de nomes de usuário: guardamos apenas o anterior. Uma cadeia
  de todos os endereços já usados custa uma tabela para um caso raro.
- Validar o domínio de cada link ("GitHub tem que ser github.com"): parece rigor e
  só atrapalha quem usa GitHub Enterprise ou domínio próprio.
- Puxar para atualizar no computador, onde não existe o gesto.
- Notificar quem seguia o endereço antigo de que ele mudou.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-041 | Meia-vida de 2h para a recência. Em 2h um post vale metade; em 6h, um oitavo — o suficiente para o recém-publicado vencer o engajado de ontem sem apagar o ranking | confirmada | Com um ajuste: duas horas SOZINHAS não bastavam: o engajamento somado cresce linear e um post com 8 reações e 5 comentários continuava imbatível às 6h. O engajamento passou a entrar em logaritmo — a diferença entre 0 e 5 interações continua grande, a diferença entre 40 e 80 quase some |
| ASM-042 | Trinta dias entre trocas de nome de usuário. Cada troca deixa um endereço para trás que a rede precisa continuar respondendo | confirmada | `DIAS_ENTRE_TROCAS = 30`. Salvar o perfil sem mexer no campo não conta como troca — senão editar a bio duas vezes esgotaria o intervalo |
| ASM-043 | Os cinco links são derivados do rótulo, sem coluna nova: o que já está gravado continua valendo, e o limite sobe de 4 para 5 | confirmada | `packages/shared/src/links.ts`. Link com rótulo desconhecido continua no banco e simplesmente não aparece nos cinco campos |
| ASM-044 | Largura única de 1024px em todas as telas, decidida com o usuário. A coluna de sugestões passa a exigir tela ≥1536px | confirmada | Medido: `main` em x=353 w=974 nas cinco telas. Nenhuma página escolhe mais a própria largura — a moldura não aceita o parâmetro, e há teste varrendo `pages/` |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-027 | O endereço antigo deve responder para sempre, ou expirar depois de um tempo? Hoje é para sempre, enquanto ninguém mais o tomar | respondida | Para sempre. Ele é `@unique`, então ninguém pode tomá-lo enquanto responde — um link antigo levando ao perfil ERRADO seria pior que não levar a lugar nenhum |
| Q-028 | O botão flutuante de publicar deve aparecer também no computador, onde a caixa de escrever fica visível no topo? | respondida | Sim, nos dois. O problema é o mesmo: quem desceu vinte publicações teria que voltar ao começo, e o caminho de volta é onde a vontade de publicar se perde |
