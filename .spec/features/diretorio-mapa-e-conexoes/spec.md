# Spec: Diretório, mapa e conexões

> feature: diretorio-mapa-e-conexoes
> status: rascunho

## Contexto

A rede já tem entrada, perfil e feed — mas ainda não cumpre o que a justifica:
**um embaixador não consegue encontrar outro.** Esta feature entrega a descoberta
(busca, mapa e perfil público), a identidade compartilhável (slug e link de
convite) e o laço entre pessoas (conexões).

Três correções de dados entram junto, porque sem elas a descoberta não funciona:
a lista de instituições não tinha campi (quem estuda no IFNMG em Pirapora não se
encontrava), as habilidades eram texto livre (então "React", "react" e "ReactJS"
nunca se cruzavam) e o perfil não tinha endereço próprio para ser compartilhado.

O mapa mostra **cidades, nunca pessoas em endereços** (P-001). Um pino por
município, com as fotos de quem está lá; clicar abre a lista. Nenhum dado mais
fino que o centroide do município existe no sistema para ser desenhado.

## Histórias

### US-016 — Encontrar minha instituição, inclusive o meu campus

Como embaixador de um campus específico, quero achar exatamente onde estudo, para
que meu perfil não me coloque numa instituição genérica que não é a minha.

#### AC-041 — Acho o campus certo pelo nome ou pela sigla

- **Dado** que estudo no campus de Pirapora do Instituto Federal do Norte de Minas Gerais
- **Quando** busco por "IFNMG", por "Pirapora" ou pelo nome por extenso
- **Então** encontro a entrada daquele campus especificamente, distinta dos outros campi
  da mesma instituição

#### AC-042 — Proponho a minha instituição quando ela não está na lista

- **Dado** que busquei e minha instituição não aparece
- **Quando** proponho o nome dela
- **Então** consigo usá-la no meu perfil imediatamente, e ela fica marcada como pendente
  para a coordenação aprovar — sem me deixar travado esperando

#### AC-043 — Instituição proposta não polui a busca dos outros

- **Dado** que alguém propôs uma instituição ainda não aprovada
- **Quando** outra pessoa busca instituições
- **Então** a proposta não aparece para ela (só quem propôs continua vendo a sua)

### US-017 — Declarar minhas habilidades de um jeito que cruze com as dos outros

Como embaixador, quero escolher habilidades de uma lista, para que quem busca por
uma delas me encontre — o que não acontece quando cada pessoa escreve do seu jeito.

#### AC-044 — Escolho habilidades de uma lista, não escrevo à mão

- **Dado** que estou editando meu perfil
- **Quando** procuro uma habilidade
- **Então** escolho entre opções existentes, e o perfil guarda a mesma identificação que
  outra pessoa que escolheu a mesma habilidade

#### AC-045 — Habilidade fora da lista é recusada

- **Dado** que tento enviar uma habilidade que não existe no catálogo
- **Quando** salvo o perfil
- **Então** a rede recusa, em vez de criar uma variação que ninguém mais vai encontrar

### US-018 — Ver o perfil de outro embaixador

Como embaixador, quero abrir o perfil de alguém e ver o que essa pessoa publicou,
para decidir se quero me conectar.

#### AC-046 — Cada perfil tem um endereço próprio e estável

- **Dado** um embaixador chamado Ana Ribeiro
- **Quando** abro o perfil dela
- **Então** o endereço é legível (`/e/ana-ribeiro`) e continua funcionando mesmo que ela
  mude o nome de exibição depois

#### AC-047 — Vejo as publicações da pessoa no perfil dela

- **Dado** que abro o perfil de alguém que já publicou
- **Quando** a página carrega
- **Então** vejo os posts dessa pessoa, do mais recente para o mais antigo

#### AC-048 — O perfil de outra pessoa não me entrega o contato dela

- **Dado** que abro o perfil de outro embaixador
- **Quando** a rede me devolve os dados
- **Então** o e-mail não vem junto, em nenhum campo

### US-019 — Procurar embaixadores por quem eles são

Como embaixador, quero filtrar o diretório por instituição, cidade, curso e
habilidade, para achar quem tem a ver com o que estou fazendo.

#### AC-049 — Filtro por habilidade e por instituição

- **Dado** um diretório com pessoas de instituições e habilidades diferentes
- **Quando** filtro por uma habilidade, ou por uma instituição
- **Então** recebo só quem corresponde, e perfis incompletos não aparecem

#### AC-050 — A busca vem em páginas estáveis

- **Dado** que percorri a primeira página de resultados
- **Quando** peço a próxima
- **Então** recebo os seguintes, sem repetir nem pular ninguém

### US-020 — Ver onde estão os embaixadores

Como embaixador, quero um mapa com as cidades onde há gente do programa, para
descobrir quem está perto de mim.

#### AC-051 — O mapa agrupa por cidade e mostra quantas pessoas há em cada uma

- **Dado** que há três embaixadores visíveis em Recife e um em São Paulo
- **Quando** carrego o mapa
- **Então** vejo um ponto em cada cidade, o de Recife indicando três pessoas

#### AC-052 — Clico numa cidade e vejo quem está lá

- **Dado** um ponto no mapa com mais de uma pessoa
- **Quando** clico nele
- **Então** vejo a lista de todas as pessoas daquela cidade, com foto e nome, e consigo
  abrir o perfil de cada uma

#### AC-053 — Quem optou por não aparecer no mapa não aparece

- **Dado** um embaixador com a visibilidade no mapa desligada
- **Quando** o mapa é montado
- **Então** ele não consta em nenhum ponto, nem na contagem da cidade dele

#### AC-054 — O mapa não expõe posição mais precisa que a cidade

- **Dado** qualquer resposta do mapa
- **Quando** examino as coordenadas devolvidas
- **Então** todas são o centro do município, iguais para todas as pessoas da mesma cidade

### US-021 — Conectar com outro embaixador

Como embaixador, quero convidar alguém para se conectar e ver quem já está
conectado comigo, para que a rede vire uma rede de fato.

#### AC-055 — Envio um convite de conexão e a pessoa aceita

- **Dado** que abro o perfil de alguém com quem não estou conectado
- **Quando** peço conexão e essa pessoa aceita
- **Então** passamos a constar um na lista do outro

#### AC-056 — Não consigo forçar conexão sozinho

- **Dado** que pedi conexão e a pessoa ainda não respondeu
- **Quando** consulto minha lista de conexões
- **Então** ela não está lá — pedido pendente não é conexão

#### AC-057 — Um pedido não vira dois

- **Dado** que já pedi conexão com alguém
- **Quando** peço de novo, ou essa pessoa pede para mim ao mesmo tempo
- **Então** continua existindo um único laço entre nós dois, nunca dois registros opostos

#### AC-058 — Recuso ou desfaço uma conexão

- **Dado** um pedido recebido, ou uma conexão já aceita
- **Quando** recuso o pedido, ou desfaço a conexão
- **Então** deixamos de constar um na lista do outro

### US-022 — Convidar alguém com um link

Como administrador do programa, quero copiar um link de convite pronto, para
mandar no grupo sem ter que explicar onde colar o código.

#### AC-059 — Gero um convite e recebo um link pronto para compartilhar

- **Dado** que sou administrador
- **Quando** gero um convite
- **Então** recebo um endereço completo que já leva a pessoa para a entrada com o código
  preenchido

#### AC-060 — Abrir o link não pede nada

> **Revisado em 2026-08-19.** Dizia "já vem com o código preenchido". Com o
> endereço `/convite/CODIGO` a tela deixou de ter campo a preencher: ela
> reconhece o convite, diz quem convidou e leva ao login (ver `convite-simples`,
> AC-134 e AC-135). Pedir que a pessoa confira o que está na barra de endereço
> era trabalho inventado.

- **Dado** um link de convite
- **Quando** alguém o abre
- **Então** o convite já está reconhecido e não há código a digitar

## Fora de escopo

- Quadro de avisos oficiais (o campo `kind` do post já existe).
- Gamificação: pontos, badges e ranking.
- Exportar e excluir a própria conta — é a próxima fatia, por exigência da LGPD.
- Sugerir conexão a partir de "Bora junto" e "Posso ajudar": o sinal já é gravado, a
  sugestão automática vem depois das conexões existirem.
- Mensagem direta entre embaixadores.
- Mapa fora do Brasil (ASM-001 confirma o capítulo brasileiro como público inicial).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-013 | Uma entrada de instituição por campus, com nome e campus no mesmo registro, resolve melhor que separar instituição e campus em duas escolhas — a pessoa procura "IFNMG Pirapora" de uma vez | aberta | — |
| ASM-014 | Nenhuma lista de instituições fica completa; o conserto durável é deixar propor, não perseguir o dataset perfeito | aberta | — |
| ASM-015 | Habilidades vêm de catálogo fechado. Texto livre impede o cruzamento que a busca precisa fazer | aberta | — |
| ASM-016 | O slug é derivado do nome no primeiro salvamento e não muda sozinho depois: endereço compartilhado que deixa de funcionar é pior que slug desatualizado | aberta | — |
| ASM-017 | Conexão é simétrica e precisa de aceite, como no LinkedIn — não "seguir" unilateral | aberta | — |
| ASM-018 | O mapa usa MapLibre com tiles do OpenFreeMap: sem chave de API, sem cadastro e sem cookies, o que evita um rastreador de terceiros numa rede de estudantes | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-009 | Quem aprova instituição proposta: administrador, ou moderador também? | aberta | — |
| Q-010 | O catálogo de habilidades pode crescer por proposta, como o de instituições, ou fica fechado sob curadoria? | aberta | — |
| Q-011 | Link de convite deve expirar junto com o código (30 dias) ou ter prazo próprio, mais curto, por circular em grupo? | aberta | — |
| Q-012 | O perfil público deve ser visível a quem NÃO está logado? Hoje não é, o que protege o diretório de scraping mas impede o embaixador de mostrar o perfil a quem está fora do programa | aberta | — |
