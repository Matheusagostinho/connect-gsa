# Spec: Acesso e perfil

> feature: acesso-e-perfil
> status: rascunho

## Contexto

O ConnectGSA é fechado: só participantes do Programa de Embaixadores Estudantis
do Google entram. Esta feature é a **primeira fatia vertical em produção** — ela
entrega a porta de entrada (login social + convite) e a identidade do embaixador
dentro da rede (perfil), com o pipeline de deploy real funcionando de ponta a
ponta. Busca, mapa, feed, avisos e gamificação vêm depois, cada um sobre esta base.

## Histórias

### US-001 — Entrar com uma conta que eu já tenho

Como embaixador do programa, quero entrar usando minha conta Google, LinkedIn ou
GitHub, para que eu não precise criar nem lembrar mais uma senha.

#### AC-001 — Entrar com o Google usando um convite válido

- **Dado** que recebi um convite válido e ainda não usado, e não tenho conta na rede
- **Quando** entro com minha conta Google informando esse convite
- **Então** minha conta é criada e eu chego autenticado na rede (a sessão vem em
  cookie `httpOnly` + `Secure` + `SameSite`, nunca no armazenamento do navegador)

#### AC-002 — Entrar pelo LinkedIn e pelo GitHub também funciona

- **Dado** que tenho um convite válido e ainda não usado
- **Quando** entro pelo LinkedIn, ou pelo GitHub
- **Então** o resultado é o mesmo do Google: conta criada e sessão ativa

#### AC-003 — Voltar por outro provedor cai na mesma conta

- **Dado** que já entrei antes pelo Google com o e-mail `ana@uni.br`, verificado
- **Quando** entro depois pelo GitHub com esse mesmo e-mail, também verificado
- **Então** caio na minha conta existente, sem criar um perfil duplicado (o
  provedor novo é vinculado à conta que já existe)

### US-002 — Garantir que só quem é do programa entra

Como coordenador do programa, quero que autenticar não baste para entrar, para que
a rede continue restrita aos embaixadores e o diretório não vire lista pública.

#### AC-004 — Sem convite e fora da lista, não entra

- **Dado** que meu e-mail não está na lista aprovada e não tenho convite
- **Quando** completo o login social com sucesso
- **Então** o acesso é recusado com uma mensagem explicando que a rede é restrita
  ao programa, e **nenhum registro de usuário é criado** no banco

#### AC-005 — Convite já usado não serve de novo

- **Dado** um convite que já foi consumido por outra pessoa
- **Quando** tento entrar com ele
- **Então** o acesso é recusado e nenhuma conta é criada

#### AC-006 — Convite vencido não serve

- **Dado** um convite cuja data de expiração já passou
- **Quando** tento entrar com ele
- **Então** o acesso é recusado e nenhuma conta é criada

#### AC-007 — Um convite cria no máximo uma conta, mesmo sob corrida

- **Dado** um convite válido usado por duas tentativas de cadastro ao mesmo tempo
- **Quando** as duas tentativas rodam em paralelo
- **Então** exatamente uma cria conta e a outra é recusada (a reserva do convite é
  um compare-and-set atômico no banco, feito no momento da criação da conta)

#### AC-008 — Ficar chutando convite é bloqueado

- **Dado** que estou tentando adivinhar códigos de convite a partir do mesmo cliente
- **Quando** passo do limite de tentativas na janela de tempo
- **Então** as tentativas seguintes são recusadas por excesso de requisições (429),
  sem revelar se algum código chegou perto de existir

### US-003 — Montar meu perfil na primeira entrada

Como embaixador recém-chegado, quero preencher meu perfil logo ao entrar, para que
os outros embaixadores consigam me encontrar e saber o que eu faço.

#### AC-009 — A rede pede o perfil antes de me deixar circular

- **Dado** que acabei de criar minha conta e ainda não preenchi o perfil
- **Quando** tento acessar qualquer área da rede
- **Então** sou levado ao preenchimento de perfil, e só saio de lá com nome,
  instituição, curso e cidade informados

#### AC-010 — Texto colado com HTML não vira código na tela

- **Dado** que colei `<img src=x onerror=alert(1)>Olá` na minha bio
- **Quando** salvo o perfil e alguém abre meu perfil
- **Então** o que aparece é texto inofensivo, sem executar nada (a limpeza acontece
  no servidor, antes de gravar)

#### AC-011 — A rede sabe minha cidade, não onde eu estou

- **Dado** que escolhi "Recife/PE" na lista de cidades ao preencher o perfil
- **Quando** meu perfil é gravado e depois consultado
- **Então** o que fica guardado e o que a API devolve é a cidade e o ponto central
  dela — nenhuma coordenada do meu aparelho é gravada ou exposta em momento algum

### US-004 — Ver e ajustar meu perfil

Como embaixador, quero ver e editar meu perfil quando algo mudar, para que minhas
informações continuem corretas ao longo do programa.

#### AC-012 — Consigo editar o meu perfil

- **Dado** que estou autenticado e com perfil preenchido
- **Quando** altero minha bio, meus links ou minhas habilidades e salvo
- **Então** as mudanças aparecem imediatamente no meu perfil

#### AC-013 — Não consigo editar o perfil de outra pessoa

- **Dado** que estou autenticado como embaixador comum
- **Quando** tento salvar uma alteração no perfil de outro embaixador
- **Então** a alteração é recusada por falta de permissão (403) e nada muda no
  perfil dele — a checagem acontece no servidor, não só na tela

#### AC-014 — O perfil de outra pessoa não me entrega o contato dela

- **Dado** que abro o perfil de outro embaixador
- **Quando** a rede me devolve os dados desse perfil
- **Então** o e-mail dele não vem junto, em nenhum campo da resposta

### US-005 — Escolher se apareço no mapa

Como embaixador, quero decidir se apareço no mapa da rede, para que minha
localização só seja visível se eu quiser.

#### AC-015 — Perfil novo nasce visível no mapa

> **Invertido em 2026-08-19.** Este critério dizia o contrário: aparecer era
> escolha ativa e o padrão era ficar fora. A mudança foi decisão do dono do
> produto, com o custo apresentado, e está descrita em `landing-e-ajustes`
> (AC-127) e no P-011. O que a sustenta continua valendo: só município, aviso no
> formulário, saída imediata, e nenhuma migração de quem já tinha perfil.

- **Dado** que acabei de preencher meu perfil e não mexi em nada de privacidade
- **Quando** consulto minhas preferências
- **Então** eu **estou** visível no mapa, pela minha cidade — nunca por endereço

#### AC-016 — Ligar e desligar tem efeito na hora

- **Dado** que estou visível no mapa
- **Quando** desligo essa opção
- **Então** deixo de constar entre os perfis visíveis no mapa imediatamente, sem
  precisar sair e entrar de novo

### US-006 — Distribuir convites com controle

Como administrador do programa, quero gerar convites, para que eu controle quem
entra sem depender de repassar uma planilha de e-mails.

#### AC-017 — Só administrador gera convite

- **Dado** que estou autenticado como embaixador comum
- **Quando** tento gerar um convite
- **Então** a ação é recusada por falta de permissão (403); o mesmo pedido feito
  por um administrador gera um convite válido e imprevisível

### US-007 — Ter a rede efetivamente no ar

Como responsável pelo projeto, quero a aplicação publicada e monitorável, para que
o lançamento para o programa não dependa de mais nenhuma etapa de infraestrutura.

#### AC-018 — A API publicada responde que está viva

- **Dado** que a API está publicada em produção
- **Quando** consulto o endereço de saúde (`/health`)
- **Então** ela responde sucesso informando a versão publicada, sem exigir login e
  sem revelar detalhe interno de infraestrutura

#### AC-019 — Área restrita não abre sem sessão

- **Dado** que não estou autenticado
- **Quando** chamo qualquer rota de perfil da API
- **Então** recebo 401 e nenhum dado de embaixador vem na resposta

### US-008 — Experimentar a rede antes de haver credenciais OAuth

Como responsável pelo projeto, quero navegar pelo aplicativo sem depender de credenciais
dos provedores sociais, para que a avaliação do produto não fique bloqueada por uma etapa
de configuração externa.

#### AC-020 — Entro como qualquer pessoa semeada, em desenvolvimento

- **Dado** que a aplicação roda fora de produção e há pessoas de exemplo no banco
- **Quando** escolho uma delas na entrada de desenvolvimento
- **Então** passo a navegar autenticado como ela, e uma área restrita responde os meus dados

#### AC-021 — Essa porta não existe em produção

- **Dado** que a aplicação sobe com a configuração de produção
- **Quando** tento alcançar qualquer endereço da entrada de desenvolvimento
- **Então** a rede responde que não existe (404), e tentar habilitá-la impede a aplicação
  de subir em vez de abrir a brecha em silêncio

### US-009 — Ler a rede do meu jeito

Como embaixador, quero escolher entre tema claro e escuro, para que eu consiga usar a rede
de madrugada sem clarão e de dia sem forçar a vista.

#### AC-022 — Minha escolha de tema vale e continua valendo

- **Dado** que escolhi o tema escuro
- **Quando** volto ao aplicativo depois
- **Então** ele abre escuro; e se eu escolher "seguir o sistema", ele volta a acompanhar a
  preferência do sistema operacional em vez de ficar preso à minha última escolha

## Fora de escopo

- Busca e filtro do diretório, e o mapa em si (só a preferência de visibilidade entra aqui).
- Feed, quadro de avisos, curtidas e comentários.
- Gamificação: pontos, badges e ranking.
- Presença online e contadores ao vivo via Firebase Realtime Database.
- Exportação e exclusão de conta pelo titular (P-012) — obrigatória antes da
  abertura pública do cadastro, planejada para a fatia seguinte.
- Upload de foto de perfil para o Cloud Storage (usaremos a foto vinda do provedor
  OAuth nesta fatia).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-001 | O público inicial é o capítulo brasileiro do programa: idioma padrão pt-BR, cidades do Brasil e LGPD como base legal | confirmada | Confirmada pelo dono do produto em 2026-08-18: seed de cidades do IBGE, pt-BR, LGPD |
| ASM-002 | O volume da primeira fatia cabe no gratuito: Cloud Run `us-east1`, Firebase Hosting Spark e Neon free | aberta | — |
| ASM-003 | Latência de ~130ms nas chamadas de API (Cloud Run em `us-east1`, fora do Brasil) é aceitável no MVP, já que o front é estático em CDN global | aberta | — |
| ASM-004 | Três papéis bastam por ora: `embaixador`, `moderador` e `admin` | confirmada | Confirmada pelo dono do produto em 2026-08-18 |
| ASM-005 | A lista de cidades vem do IBGE e é fixa no seed, sem cadastro de cidade pelo usuário | aberta | — |
| ASM-006 | Vincular provedores diferentes pelo mesmo e-mail só é seguro quando o provedor declara o e-mail verificado; provedor sem essa garantia não vincula | confirmada | Decisão de segurança (P-001 do Better Auth `trustedProviders`); vínculo só entre Google, LinkedIn e GitHub com e-mail verificado |
| ASM-007 | Convite não é nominal: qualquer pessoa com o código entra, e o controle está na distribuição feita pelo administrador | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-001 | O programa fornece a lista oficial de e-mails dos embaixadores, ou o acesso será só por código de convite? | aberta | — |
| Q-002 | O alcance é o capítulo brasileiro, os Estados Unidos ou global? A pesquisa indica o programa 2026 como US-only, com variante na Índia — isso muda idioma padrão, centro do mapa e base legal (LGPD × GDPR) | aberta | — |
| Q-003 | O nome "ConnectGSA" e qualquer referência visual ao programa têm aval do Google? Sem aval, entra aviso de projeto não oficial no rodapé e no README | aberta | — |
| Q-004 | Vamos registrar `connectgsa.com.br` (~R$40/ano) ou o MVP fica em `connectgsa.web.app`? | aberta | — |
| Q-005 | Quem são os administradores iniciais, e como o primeiro admin é promovido (seed com e-mail fixo × promoção manual no banco)? | aberta | — |
