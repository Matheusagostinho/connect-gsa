<div align="center">

<img src="apps/web/public/logo.svg" alt="" width="88" height="88">

# ConnectGSA

**A rede fechada dos participantes do Programa de Embaixadores Estudantis do Google.**

Perfil, diretório, mapa, feed e conexões — para quem está no programa encontrar,
reconhecer e trabalhar junto com quem também está.

</div>

---

> **Projeto não oficial.** O ConnectGSA não é afiliado ao Google nem endossado por ele.
> O nome e as referências ao programa são descritivos e serão revistos caso a coordenação
> se manifeste.

> **Código aberto para leitura e contribuição, não para uso livre.** Veja
> [Licença](#licença) antes de assumir o contrário.

## Sumário

- [Situação atual](#situação-atual) · o que existe e o que não
- [Arquitetura](#arquitetura) · e por que cada escolha
- [Como rodar](#como-rodar) · do zero, em cinco minutos
- [Colocar no ar](#colocar-no-ar) · o passo a passo de produção
- [Contribuindo](#contribuindo) · como mandar um PR que entra
- [Licença](#licença)

As seções do meio explicam as decisões de produto — as reações, o ranking do feed, o mapa,
os convites — e existem porque **a decisão é a parte cara**; o código é a parte fácil de
reconstruir.

## Situação atual

Primeira fatia vertical em produção: **acesso e perfil**.

| Entregue | Ainda não |
|---|---|
| Monorepo, CI/CD e publicação | Busca no diretório e mapa |
| Login social (Google, LinkedIn, GitHub) | Gamificação (pontos, badges, ranking) |
| Acesso restrito por convite ou lista aprovada | Presença online em tempo real |
| Perfil: criar, ver, editar, sair da conta | Notificar a rede sobre um aviso novo |
| Feed com ranking, posts, comentários | Notificação de reação e comentário |
| Cinco reações próprias | Sugerir conexão a partir de "Bora junto" |
| Envio de imagem em post e foto de perfil | Vídeo |
| Diretório com busca e filtro por habilidade | Notificação de pedido de conexão |
| Mapa por cidade, com pinos clicáveis | Mensagem direta |
| Perfil público em `/perfil/{slug}` com as publicações | Mapa fora do Brasil |
| Conexões: pedir, aceitar, recusar, desfazer | Exportar e excluir a própria conta |
| Link de convite pronto para compartilhar | |
| Notificações de reação, comentário e conexão | |
| Navegação lateral no computador, inferior no celular | |
| Exportar e excluir a conta (LGPD art. 18, V e VI) | |
| Página de apresentação e tela de configurações | |
| Quadro de avisos oficiais | |
| Controle de visibilidade no mapa | |
| Feed em abas: "Para você" e "Seguindo" | |
| Caixa de notificações no cabeçalho | |
| Perfil com publicações, abas e contagens | |
| Coluna de sugestões no computador | |
| Nome de usuário editável, com o antigo respondendo | |
| Cinco campos de link no perfil | |
| Apresentação com nuvem de pixels interativa | |
| Convite de 8 caracteres, gerado por qualquer embaixador | |
| Convite que atende várias pessoas, válido por 15 dias | |
| Indicação registrada: quem trouxe quem | |
| Publicação em parágrafos | |
| Fontes servidas do próprio domínio e CSP no Hosting | |

**347 testes · 137 critérios de aceite provados.** A especificação completa de cada fatia,
com critérios e provas, está em `.spec/features/`. Quem decide se um critério passou é o
test runner, nunca quem implementou.

Um risco está **aceito, não resolvido**: não existe revogar convite. Quem entra por um link
vazado vê o diretório, e o link vale 15 dias. É aceitável porque a divulgação é em grupo
fechado do programa e isto não é produto oficial — mas está escrito aqui, não escondido.

## Arquitetura

```
Pessoa ──> Vercel (SPA estático, CDN global)
             │
             ├─ XHR ──> Render (Fastify) ──> Neon Postgres
             │
             └─ <img> ──> Cloudflare R2 (fotos)
```

| Camada | Escolha | Por quê |
|---|---|---|
| SPA | Vite + React 19 na **Vercel** | Tudo fica atrás de login: SSR não teria o que renderizar |
| Visual | Google Sans, claro/escuro | Linguagem do antigravity.google; a fonte é SIL OFL desde jan/2026 e é servida do próprio domínio |
| API | Fastify 5 no **Render** | Separada do front, com validação e autorização próprias |
| Banco | Postgres (**Neon**) via Prisma 7 | Fonte de verdade; PostGIS disponível quando precisar |
| Auth | Better Auth | O Auth.js foi absorvido por ele e não recebe mais features |
| Autorização | CASL | Mesmas regras no servidor (valem) e na tela (só escondem) |
| Mídia | **Cloudflare R2** | 10 GB no gratuito, e **sem cobrança de saída de dados** — que é o custo que mata bucket de imagem |

**Custo: US$ 0/mês** no volume do MVP — com uma ressalva que não dá para varrer
para baixo do tapete, abaixo.

### As duas consequências de escolher o gratuito

**1. O Render hiberna.** Sem tráfego por ~15 minutos, o serviço dorme; a próxima
requisição espera **~50 segundos**. Numa rede onde a pessoa chega por um link de
convite, 50s de tela branca é o pior momento possível para isso acontecer.

A mitigação é um ping externo em `/health`. Há um workflow no repositório
(`manter-api-acordada.yml`) e ele **não basta sozinho**: o cron do GitHub Actions
é entregue por melhor esforço e atrasa 20 ou 30 minutos sob carga, enquanto a
hibernação chega aos 15. Por isso o guia manda configurar o **UptimeRobot**
(gratuito, intervalo real de 5 minutos) como principal, com o workflow de
reforço. A saída definitiva é o plano Starter, US$ 7/mês.

**2. `vercel.app` e `onrender.com` são sites diferentes.** Isso obriga
`COOKIE_SAME_SITE=none`, e o que se perde está escrito em
[Colocar no ar](#colocar-no-ar), Passo 6. Com domínio próprio nos dois, volta
para `lax`.

### O que a interface `StorageDriver` já pagou

A troca de Cloud Storage por Cloudflare R2 foi **um arquivo novo e uma linha no
`app.ts`**. Nenhuma rota, nenhum serviço e nenhuma linha do banco souberam que o
provedor mudou — porque o banco guarda a **chave** do objeto, nunca a URL, e a
URL é montada na saída.

## Como rodar

Pré-requisitos: **Node 22+**, **pnpm 10+**, **Docker**.

```bash
git clone https://github.com/Matheusagostinho/connect-gsa.git
cd connect-gsa
pnpm install

cp .env.example .env
# Gere o segredo da sessão e cole em BETTER_AUTH_SECRET:
#   openssl rand -base64 32

docker compose up -d          # Postgres local na porta 5433
pnpm db:migrate               # aplica as migrações
pnpm db:seed                  # 5.571 municípios do IBGE + 94 instituições
pnpm db:seed:dev              # pessoas fictícias para você navegar
pnpm db:test:setup            # banco separado para a suíte de testes

pnpm dev                      # API em :3333 e SPA em :5173
```

Abra **http://localhost:5173/dev** e escolha uma pessoa para entrar.

### Entrar sem credenciais OAuth

A tela `/dev` existe para você testar o aplicativo antes de haver credenciais
OAuth. Ela lista as pessoas semeadas e entra como qualquer uma delas — inclusive
o Diego, que tem perfil incompleto e serve para ver o onboarding sendo exigido.

Isso é uma porta dos fundos deliberada, e por isso é travada em três camadas: a
API **se recusa a subir** se essas rotas forem registradas com
`NODE_ENV=production`, o `app.ts` só as registra fora de produção, e há teste
provando as duas coisas. A tela some do build de produção.

### Ligar o OAuth de verdade

1. **Google** — [Console](https://console.cloud.google.com/apis/credentials) →
   *Criar credenciais* → *ID do cliente OAuth* → *Aplicativo da Web*.
2. **GitHub** — Settings → Developer settings → OAuth Apps → *New OAuth App*.
3. **LinkedIn** — [Developers](https://www.linkedin.com/developers/apps) → *Create app*
   → aba *Auth*.

Em todos, cadastre a URL de retorno
`http://localhost:3333/api/auth/callback/{google|github|linkedin}` (e a equivalente
com o domínio de produção). Cole os pares de id/segredo no `.env` e reinicie a API.

### Primeiro acesso

Como a rede é fechada, o primeiro usuário precisa entrar por um dos dois caminhos:

```sql
-- Caminho A: liberar seu e-mail na lista aprovada
INSERT INTO "AllowedEmail" (id, email) VALUES (gen_random_uuid(), 'voce@uni.br');

-- Depois do primeiro login, promova-se para poder gerar convites:
UPDATE "User" SET role = 'admin' WHERE email = 'voce@uni.br';
```

Com um administrador no ar, `POST /invites` gera convites para os demais.

## Testes

```bash
docker compose up -d
pnpm db:test:setup            # só na primeira vez
pnpm test                     # suíte inteira
pnpm turbo run lint typecheck
```

Os testes rodam contra um Postgres de verdade, não contra mocks: unicidade de e-mail,
comportamento sob corrida e o `ON DELETE SET NULL` que preserva a indicação são garantias
do BANCO, e um mock aprovaria implementações erradas.

Eles usam um **banco separado** (`connectgsa_test`), porque limpam tabelas inteiras entre
casos — apontá-los para o banco de desenvolvimento apagaria os dados que você semeou. O
código se recusa a rodar se `TEST_DATABASE_URL` for igual a `DATABASE_URL`.

## As reações

O conjunto é próprio, e a escolha não é estética. Numa rede de **conexão**, "gostei"
desperdiça a interação: as três primeiras reconhecem o post, e as duas últimas sinalizam
disposição de trabalhar junto.

| Reação | Diz | Peso no feed | Cor |
|---|---|---|---|
| **Decolou** | Isso aqui é notável | 1 | azul |
| **Aprendi** | Aprendi alguma coisa com isso | 1,5 | amarelo |
| **Respeito** | Reconheço o esforço por trás disso | 1 | verde |
| **Bora junto** | Quero construir isso com você | 3 | roxo |
| **Posso ajudar** | Tenho como ajudar nisso | 3 | vermelho |

Cada uma é um **ícone desenhado, não emoji**: há sistema sem fonte de emoji instalada, onde
o caractere vira quadrado vazio. A reação escolhida ganha a cor dela e o traço é redesenhado
na troca — nunca para quem pediu menos movimento no sistema.

No cartão aparece **só o ícone**: o rótulo escrito repetia o que o desenho já diz e custava
largura suficiente para o nome de quem publicou virar reticências. **Um toque** aplica;
**pressionar e segurar** abre a fileira das cinco, como no Facebook. Arrastar cancela — num
feed, o dedo que desce a tela começa em cima de algum elemento, e sem essa guarda rolar
viraria uma loteria de menus abertos. No teclado, onde "segurar" não existe, a seta para
cima abre.

Uma reação por pessoa por post, trocável: escolher outra substitui a anterior, escolher a
mesma desfaz. Isso força a pessoa a dizer o que realmente quis dizer e mantém cada sinal
limpo para o ranking.

## Como o feed ordena

O raciocínio veio do código aberto do X (`xai-org/x-algorithm`), mas **os pesos de lá não
foram copiados** — e isso é deliberado. O comentário no `param.rs` deles avisa que aqueles
números multiplicam *probabilidades previstas por um modelo treinado*, não contagens. Um
report vale −234 porque a probabilidade base dele é mais de mil vezes menor que a de um
like. Aplicar aquela tabela sobre contagens brutas, que é o que temos, produziria
ordenação sem sentido.

O que atravessou foram quatro ideias independentes de modelo:

1. **Ação de esforço vale mais que ação de toque** — comentar pesa 4, reagir pesa 1 a 3.
2. **Diversidade de autor** — cada post seguinte do mesmo autor vale metade, até um piso de
   25%. Numa rede de centenas, uma pessoa prolífica tomaria a tela inteira.
3. **Início frio suavizado** — a nota nunca chega a zero, então post recém publicado
   disputa por recência em vez de ser enterrado por ainda não ter sido visto.
4. **Proximidade em vez de punição** — no X, quem você não segue leva desconto, porque lá
   são centenas de milhões de contas. Aqui a rede cabe numa sala: quem é da sua instituição
   ou cidade sobe, e ninguém desce.

A recência tem **meia-vida de 2 horas**, e o engajamento entra em **logaritmo**. As duas
coisas juntas são o que faz o recém-publicado aparecer no topo: com soma linear, um post
muito reagido ficava imbatível e a rede reencontrava o assunto de ontem toda manhã. Em log,
a diferença entre 0 e 5 interações continua grande — que é a que importa — e a diferença
entre 40 e 80 quase some, que é a que não importa para quem está lendo.

A função está em `apps/api/src/modules/feed/ranking.ts`. É pura, sem banco e sem relógio
implícito — cada regra tem um teste próprio.

## As duas abas do feed

**"Seguindo"** filtra: só publicações de quem já é conexão, mais as suas. **"Para você"**
não filtra nada — a afinidade (mesmo curso, mesmo estado, habilidade em comum, mesma
instituição, mesma cidade) entra como *impulso no ranking*, não como cláusula de busca.

A diferença importa: um filtro rígido deixaria a tela inicial de quem acabou de chegar
completamente vazia, e quem acabou de chegar é justamente quem mais precisa ver a rede. Há
teste garantindo que "Para você" continue mostrando a rede inteira mesmo para quem não tem
afinidade com ninguém.

## Convites

Todo embaixador convida, até **5 a cada 30 dias** — coordenação e moderação sem teto.

O código tem **8 caracteres** de um alfabeto sem I, L, O e U — as três primeiras se
confundem com 1 e 0 na leitura, e a última com V ao ditar, que é como um convite circula.
Oito e não cinco porque o convite é o único portão da rede: com 5 caracteres e cinquenta
convites ativos, um atacante acerta um em cerca de dois meses; com 8, leva milhares de
anos. E como o banco guarda só o hash, 5 caracteres seriam quebrados por força bruta em
segundos num vazamento.

O link é `/convite/ABC5EK9M`. Abri-lo mostra quem convidou — só o primeiro nome, para o
link não virar um jeito de descobrir quem está na rede sem entrar nela. Um convite
inexistente ou expirado recebe **a mesma recusa**: distinguir os dois entregaria de graça
o oráculo que o limite de tentativas existe para negar.

### O convite não é mais de uso único, e o que isso custou

Até 20/08/2026 um convite servia a **uma pessoa**, com reserva atômica no Postgres. Ele
passou a valer para **quantas pessoas receberem o link**, por decisão do dono do produto:
um embaixador que quisesse trazer as quarenta pessoas do capítulo dele precisava de
quarenta links e só podia criar cinco.

O custo está escrito aqui porque um README que só conta o lado bom da decisão é
propaganda:

> **O uso único era o que continha um link vazado, e ele não existe mais.** Um link colado
> num grupo de trezentas pessoas entrega trezentos acessos, e nenhuma outra camada impede
> isso.

O que ficou no lugar são dois freios mais fracos, e vale saber exatamente o que cada um
faz:

- **O prazo caiu de 30 para 15 dias.** Ele *não* contém o vazamento rápido — o grupo de
  WhatsApp entrega os trezentos acessos em duas horas, não em quinze dias. O que ele contém
  é o vazamento **lento**: o print esquecido, o convite no e-mail de alguém que largou a
  conta. Para esse, prazo curto é a defesa certa.
- **O teto de criação por período continua.** Ele limita quantos links distintos uma conta
  comprometida põe na rua, não quantas pessoas entram por cada um.

**O que não foi afrouxado junto**, e não pode ser sem decisão própria: o código continua
vindo de gerador criptográfico e guardado só como hash, a recusa continua sendo mensagem
única, o limite de tentativas continua valendo, e a página do convite continua devolvendo
só o primeiro nome de quem convidou.

A mudança está registrada na constituição (P-009) com o motivo e o custo, e os critérios
AC-005 e AC-007 foram invertidos com a razão anterior preservada — não apagada.

### O risco aceito, com nome

Não existe revogar convite. Sem uso único, revogar seria o único jeito de estancar um link
vazado antes dos 15 dias — e ele não existe ainda.

O dono do produto avaliou e aceitou, e o raciocínio fica registrado para quem ler isto
depois não achar que foi descuido:

- O link é divulgado **num grupo fechado do programa**, não em rede aberta.
- O ConnectGSA **não é produto oficial** do Google nem do programa; um acesso indevido não
  compromete sistema de terceiro.
- **A fronteira que importa é dado pessoal, e ela não foi afrouxada:** e-mail continua sem
  sair da API, localização continua sendo só o município, imagem continua sendo
  reprocessada sem EXIF.

O que fica, dito sem eufemismo: **quem entra por um convite vazado vê o diretório** — nome,
instituição, cidade, curso, habilidades e links de todo mundo. Para um grupo fechado do
programa isso é pouco, e não é nada. É o que torna a revogação desejável (Fatia 9), não
urgente.

### A indicação

Quem entra por um convite fica registrado como **indicado** por quem o gerou. O vínculo
mora em quem foi indicado (`User.invitedById`), não no convite, e a chave estrangeira é
`SET NULL` e nunca `CASCADE`: com cascade, excluir um embaixador apagaria em silêncio o
registro de todo mundo que ele trouxe — e o defeito só apareceria no dia em que alguém
saísse do programa.

Um convite é um papel que se consome; a indicação é um fato. Com um convite atendendo
várias pessoas, guardá-la no convite passou a ser impossível de qualquer forma.

## O mapa

MapLibre GL com tiles do **OpenFreeMap** (estilo Positron). A escolha não é só de custo:
o OpenFreeMap serve **sem chave de API, sem cadastro e sem cookies** — numa rede de
estudantes, não introduzir um rastreador de terceiros pesa mais que qualquer conveniência.
O Mapbox GL virou licença proprietária na versão 2 e exigiria token com faturamento.

É o mesmo argumento que tirou a fonte do CDN do Google: quem serve a página não deve
entregar o IP de um estudante a ninguém que ele não escolheu.

**O perfil nasce visível no mapa** — padrão invertido em 19/08/2026. O princípio
anterior dizia o contrário, e a mudança está registrada na constituição com o motivo,
não apagada. O que a sustenta: só o município é conhecido, o formulário de entrada avisa
que a pessoa vai aparecer, sair tem efeito imediato, e quem já tinha perfil não foi
migrado.

**Um pino por cidade, nunca por pessoa.** Isso não é agrupamento visual: a API não devolve
posição individual porque ela não existe no sistema. Desenhar uma pessoa num ponto exigiria
inventar uma coordenada — exatamente o que o P-001 proíbe.

O MapLibre pesa ~250 KB e é carregado **sob demanda**: quem só abre o feed não baixa um
motor de mapa que não vai usar. Contra o teto de banda da Vercel, isso é a diferença entre
dezenas de milhares e centenas de milhares de visitas por mês.

### Uma armadilha que custou caro

O worker do MapLibre importa um módulo irmão (`maplibre-gl-shared.mjs`). Deixar o
empacotador cuidar disso copia só um dos dois arquivos, e o import falha **dentro do
worker** — onde o erro não chega ao console. O mapa aparece normalmente, cinza, sem um
único tile e sem aviso.

Daí duas defesas: `apps/web/scripts/copiar-worker-do-mapa.mjs` copia o par junto para
`public/`, e o `vercel.json` **não** reescreve `/assets/**`, `/fonts/**` nem `/maplibre/**`
para o `index.html` — assim um arquivo ausente responde 404 honesto em vez de HTML com
status 200, que o navegador tentaria executar como script.

## Instituições e habilidades

A lista de instituições é **por campus**: quem estuda no IFNMG em Pirapora encontra o campus
dele, não só a reitoria. São 628 entradas, incluindo os 38 Institutos Federais com seus campi.

Nenhuma lista de instituições do Brasil fica completa, e perseguir o dataset perfeito é
trabalho sem fim — as fontes oficiais do MEC e do INEP não expõem os campi de forma
consultável. O conserto durável foi outro: **quem não achar a sua propõe**, usa na hora, e a
coordenação aprova depois. Proposta pendente só aparece para quem propôs.

Habilidades vêm de um **catálogo fechado** de 78 opções em 9 categorias. Texto livre parecia
mais flexível e destruía a busca: "React", "react" e "ReactJS" nunca se cruzavam, então
filtrar o diretório por habilidade não encontrava ninguém.

## Segurança e privacidade

Os princípios verificáveis estão em `.spec/constituicao.md` — os marcados `[DEVE]` têm
verificação executável. Os que mais moldam o código:

- **Localização nunca é precisa.** O sistema guarda a cidade e usa o centroide do município.
  Não existe coluna de latitude ou longitude em `User`, e o navegador tem `geolocation`
  bloqueada por `Permissions-Policy`. Arredondar só na saída seria frágil demais.
- **E-mail nunca sai da API.** Os schemas de resposta não têm o campo, então devolvê-lo é
  impossível — não apenas proibido.
- **Autenticar não é entrar.** Login social prova identidade; entrar exige convite válido ou
  e-mail na lista do programa.
- **Convite é imprevisível e tem prazo curto.** Código de gerador criptográfico, guardado
  só como hash, com limite agressivo de tentativas e validade de 15 dias. **Deixou de ser
  de uso único em 20/08/2026** — o que isso custou está em [Convites](#convites), escrito
  por extenso.
- **Sessão em cookie httpOnly.** Sem senha própria: nada de hash para vazar nem fluxo de
  recuperação para atacar.
- **Autorização no servidor.** A tela esconde botões; quem recusa é a API.
- **Texto livre é sanitizado na entrada**, antes de chegar ao banco. O link é reconhecido só
  na exibição, pelo React — o conteúdo continua texto puro, que é o que impede injeção.
- **O titular exporta e exclui os próprios dados.** Excluir apaga as imagens do
  armazenamento e acerta os contadores das publicações de terceiros antes da cascata.
- **Toda imagem é reprocessada.** Foto de celular carrega coordenadas de GPS no EXIF;
  guardá-la como veio entregaria a localização exata de um estudante. Não removemos "os
  campos ruins" — decodificamos os pixels e escrevemos um arquivo novo, que nasce sem
  metadado nenhum. O tipo é decidido pelos bytes, nunca pela extensão.
- **Nenhum terceiro é chamado sem motivo.** As tiles do mapa vêm do OpenFreeMap, que não
  pede chave nem grava cookie, e a Google Sans é servida **do próprio domínio**. Uma rede
  de estudantes não deve entregar IP e User-Agent a um CDN a cada visita — e o único
  terceiro que resta é a foto de perfil que o provedor social devolve no primeiro login.
- **`Content-Security-Policy` no Hosting**, como segunda camada. A primeira continua sendo
  a sanitização na entrada; a CSP existe para o dia em que ela falhar. Ela foi verificada
  num navegador de verdade, com o mapa aberto, antes de ir para o repositório — este
  projeto já perdeu um dia com um mapa cinza sem erro no console.
- **A API se recusa a subir** sem bucket de imagens em produção, e o login de
  desenvolvimento não existe fora dela. Aviso em README não é trava.

### Reportar uma falha

Abra uma issue **sem detalhes exploráveis** — só o suficiente para eu saber que existe — e
peça contato privado. Nada de prova de conceito em issue pública numa rede que tem dados de
estudante dentro.

## Limites conhecidos do plano gratuito

| Serviço | Limite | O que acontece ao estourar |
|---|---|---|
| Render | Hiberna após ~15 min sem tráfego; 750 h/mês | Volta em ~50 s na primeira requisição |
| Vercel | 100 GB/mês de banda | Passa a cobrar |
| Neon | 0,5 GB e 191 h de compute | Banco suspende |
| Cloudflare R2 | 10 GB, 1 M gravações e 10 M leituras/mês | Passa a cobrar — mas **saída de dados é sempre grátis** |

O primeiro a apertar é a **hibernação do Render**, e ela aperta desde o primeiro
dia. Os outros três estão folgados para uma rede de centenas de pessoas.

## Colocar no ar

Nada disso está publicado ainda, e **o que falta não é código**: são contas,
credenciais e alguns valores que precisam casar entre si.

> **Leia isto antes de começar.** Três coisas deste guia falham **em silêncio** —
> o deploy passa, a tela abre, e o defeito aparece depois. Estão marcadas com ⚠️.
> Se você pular qualquer coisa, não pule essas.

### Passo 0 — Contas

| Conta | Onde | Custo |
|---|---|---|
| Render | [render.com](https://render.com) | Gratuito (hiberna) |
| Vercel | [vercel.com](https://vercel.com) | Gratuito |
| Cloudflare | [cloudflare.com](https://www.cloudflare.com/pt-br/) | Gratuito |
| Neon | [neon.tech](https://neon.tech) | Gratuito até 0,5 GB |
| UptimeRobot | [uptimerobot.com](https://uptimerobot.com) | Gratuito — é o que impede a hibernação |

Todas aceitam entrar com a conta do GitHub.

### Passo 1 — Banco no Neon

- [ ] Criar projeto, **região `us-west-2` (Oregon)** — a mesma do Render, para
      API e banco ficarem lado a lado
- [ ] Copiar a string do **pooler** (a que tem `-pooler` no host), **não** a direta

O Render reinicia o contêiner com frequência no plano gratuito; sem pooler, o
Neon esgota conexões.

```bash
export DATABASE_URL="postgresql://...-pooler...neon.tech/connectgsa?sslmode=require"

pnpm --filter @connect-gsa/db exec prisma migrate deploy
pnpm --filter @connect-gsa/db run seed     # 5.571 municípios + 628 campi + 78 habilidades
```

> **Não rode `db:seed:dev`** — ele cria pessoas fictícias.

### Passo 2 — Bucket no Cloudflare R2 ⚠️

No painel da Cloudflare → **R2** → *Create bucket*.

- [ ] Bucket criado, nome `connect-gsa-media`
- [ ] Em *Settings* → **Public access** → ligar o subdomínio `r2.dev`
      (ou ligar um domínio próprio, se você tiver)
- [ ] Anotar o endereço de leitura: `https://pub-XXXX.r2.dev`
- [ ] Anotar o **Account ID** (aparece na barra lateral do R2)

Depois, *Manage R2 API Tokens* → *Create API Token*:

- [ ] Permissão **Object Read & Write**
- [ ] Escopo: **apenas este bucket**, nunca a conta inteira — uma chave vazada
      não deve alcançar mais que as imagens
- [ ] Anotar `Access Key ID` e `Secret Access Key` (o segredo aparece **uma vez**)

> ⚠️ **Falha em silêncio #1.** O endereço de **leitura** (`pub-….r2.dev`) e o
> endpoint de **escrita** (`….r2cloudflarestorage.com`) são hosts diferentes.
> `MEDIA_PUBLIC_URL` é o de leitura. Trocar os dois faz toda imagem responder
> 401 — e a tela só mostra a inicial, sem dizer por quê.

### Passo 3 — Credenciais OAuth

Você ainda não tem as URLs finais. Faça este passo **depois do Passo 4**, ou volte
aqui quando souber a URL do Render.

Em cada provedor, cadastre a URL de retorno
`https://SUA-API.onrender.com/api/auth/callback/{google|linkedin|github}`:

- [ ] **Google** — [Credenciais](https://console.cloud.google.com/apis/credentials) →
      *Criar credenciais* → *ID do cliente OAuth* → *Aplicativo da Web*
- [ ] **GitHub** — Settings → Developer settings → OAuth Apps → *New OAuth App*
- [ ] **LinkedIn** — [Developers](https://www.linkedin.com/developers/apps) →
      *Create app* → aba *Auth*

O LinkedIn é o mais lento: exige página de empresa e passa por verificação.
**Comece por ele.**

### Passo 4 — API no Render

O repositório traz um `render.yaml`: painel do Render → **New** → **Blueprint** →
aponte para o repositório. Ele cria o serviço com o `Dockerfile` que já existe,
com `healthCheckPath: /health` e com a migração rodando antes de trocar a versão
no ar.

Preencha no painel as variáveis marcadas `sync: false`:

- [ ] `DATABASE_URL` — a string do pooler do Neon
- [ ] `MEDIA_BUCKET` — `connect-gsa-media`
- [ ] `MEDIA_PUBLIC_URL` — `https://pub-XXXX.r2.dev` (o de **leitura**)
- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- [ ] Os seis pares de OAuth
- [ ] `API_URL` — a URL que o Render deu, **sem** `/api`
- [ ] `WEB_URL` e `WEB_ORIGINS` — preencha depois do Passo 5, com a URL da Vercel

`BETTER_AUTH_SECRET` o Render gera sozinho (`generateValue: true`).
`COOKIE_SAME_SITE` já vem como `none` — veja o Passo 6.

```bash
curl -sS "https://SUA-API.onrender.com/health"   # {"status":"ok","version":"..."}
```

- [ ] `/health` respondendo

> A API **se recusa a subir** se faltar qualquer uma das cinco variáveis do R2.
> Isso é deliberado: sem bucket ela gravaria no disco do contêiner, que some a
> cada hibernação. Se o deploy falhar reclamando de `R2_...`, é esta trava.

### Passo 5 — SPA na Vercel

Painel da Vercel → **Add New** → **Project** → importe o repositório. O
`vercel.json` já traz build, saída e cabeçalhos; não mexa em *Framework Preset*
(fica `Other`).

Só uma variável de ambiente:

- [ ] `VITE_API_URL` = `https://SUA-API.onrender.com/api` — **com** `/api`

> O `API_URL` do Render é **sem** `/api` e o `VITE_API_URL` é **com**. Não é
> inconsistência: o primeiro é a raiz que o Better Auth usa para montar os
> retornos de OAuth; o segundo é a base que o cliente HTTP concatena com `/me`,
> `/feed` e as demais. Eu mesmo tropecei nisso testando a CSP — sem o `/api`, o
> app chama `/me` na raiz e leva 404 em tudo.

Depois do primeiro deploy, volte ao Render e preencha `WEB_URL` e `WEB_ORIGINS`
com a URL da Vercel, e ao Passo 3 para cadastrar as URLs de retorno reais.

### Passo 6 — ⚠️ O cookie, e por que ele precisa ser `none` aqui

> ⚠️ **Falha em silêncio #2, e é a pior de todas.**

O cookie de sessão é `SameSite`. `Lax` — o valor seguro — só é enviado quando o
SPA e a API estão no **mesmo site**, isto é, no mesmo domínio registrável:

| SPA | API | Mesmo site? |
|---|---|---|
| `connect-gsa.vercel.app` | `connect-gsa-api.onrender.com` | ❌ **não** — `vercel.app` e `onrender.com` são sufixos públicos diferentes |
| `connectgsa.com.br` | `api.connectgsa.com.br` | ✅ sim |

Cross-site com `Lax`, o navegador aceita o cookie na volta do OAuth (que é
navegação de topo) e **não o envia em nenhuma chamada de dado depois**. O login
parece dar certo, o aplicativo abre deslogado, e não há uma linha de erro no
console. Em desenvolvimento nunca acontece, porque lá tudo é `localhost` atrás do
proxy do Vite.

Com os domínios padrão, portanto, **`COOKIE_SAME_SITE=none` é requisito**, não
escolha. O preço é explícito: o cookie passa a atravessar sites e a única defesa
de CSRF que resta é a lista de origens do CORS (`WEB_ORIGINS`, sem curinga).

- [ ] `COOKIE_SAME_SITE=none` confirmado no Render
- [ ] `WEB_ORIGINS` com a origem exata da Vercel, sem curinga

**No dia em que você comprar um domínio**, aponte o SPA para o apex e a API para
`api.`, e volte para `lax`. É uma variável.

### Passo 7 — ⚠️ Ajustar a CSP

> ⚠️ **Falha em silêncio #3.**

Abra `vercel.json`. Dois marcadores precisam virar os seus endereços:

```jsonc
"connect-src 'self' https://API-DA-SUA-INSTALACAO ..."
//                  └─ SUA-API.onrender.com — senão o SPA não fala com o servidor

"img-src 'self' data: blob: https://MIDIA-DA-SUA-INSTALACAO ..."
//                          └─ pub-XXXX.r2.dev — senão TODA foto vira a inicial
```

- [ ] `connect-src` com o host do Render
- [ ] `img-src` com o host do R2
- [ ] Commitado e enviado (a Vercel republica sozinha)

### Passo 8 — Impedir a hibernação

- [ ] **UptimeRobot** → *Add New Monitor* → HTTP(s) → URL
      `https://SUA-API.onrender.com/health` → intervalo **5 minutos**
- [ ] No GitHub, *Settings → Secrets and variables → Actions* → **Variables** →
      `API_URL` = `https://SUA-API.onrender.com` (alimenta o workflow de reforço)

O workflow do repositório sozinho **não resolve**: o cron do GitHub é entregue
por melhor esforço e atrasa 20 ou 30 minutos sob carga, enquanto a hibernação
chega aos 15. Ele é rede de segurança; o UptimeRobot é o principal.

### Passo 9 — O primeiro usuário

A rede é fechada: **não existe cadastro aberto**. O primeiro acesso é liberado à
mão no banco.

```sql
-- 1. ANTES do primeiro login
INSERT INTO "AllowedEmail" (id, email) VALUES (gen_random_uuid(), 'voce@uni.br');
```

- [ ] E-mail liberado
- [ ] Login feito pelo aplicativo

```sql
-- 2. DEPOIS do login: promova-se
UPDATE "User" SET role = 'admin' WHERE email = 'voce@uni.br';
```

- [ ] Promovido a admin

Daí em diante, Configurações gera convites e a rede cresce sozinha.

### Passo 10 — Conferência antes de divulgar

À mão, uma vez, com as ferramentas de desenvolvedor abertas:

- [ ] Login por Google, LinkedIn **e** GitHub — os três
- [ ] **Recarregue depois de logar e continue logado** ← teste do ⚠️ 2. Se cair
      para a tela de entrada, `COOKIE_SAME_SITE` está errado
- [ ] O mapa abre **com tiles**, não cinza
- [ ] Enviar uma foto de perfil e vê-la aparecer ← teste do ⚠️ 1
- [ ] Console **sem** nenhuma linha com "Content Security Policy" ← teste do ⚠️ 3
- [ ] `https://SUA-API.onrender.com/api/dev/users` responde **404** (a porta dos
      fundos não existe em produção)
- [ ] Gerar um convite e abrir o link numa janela anônima
- [ ] Esperar 20 minutos sem tocar e abrir de novo: se demorar ~50 s, o ping do
      Passo 8 não está funcionando

### Se precisar voltar atrás

- **API:** Render → o serviço → *Events* → *Rollback* na versão anterior.
- **SPA:** Vercel → *Deployments* → *...* → *Promote to Production* numa anterior.
- **Banco:** migração **não volta sozinha.** O `render.yaml` aplica as migrações
  antes de trocar a versão no ar, e essa ordem é deliberada — schema novo com
  código velho é tolerável por segundos; código novo contra schema velho quebra.
  Para reverter, escreva a migração inversa.

## Contribuindo

O ConnectGSA é feito por embaixadores, no aberto. Correção, ideia e crítica são bem-vindas
— inclusive de quem não é do programa.

**Comece por aqui:** rode o projeto ([Como rodar](#como-rodar)), abra uma issue descrevendo
o que você quer fazer, e espere um "pode ir" antes de escrever muito código. Isso poupa o
seu tempo, não o meu: metade das ideias esbarra numa decisão que já foi tomada e está
escrita em `.spec/constituicao.md`.

**Antes de abrir o PR:**

```bash
pnpm test
pnpm turbo run lint typecheck
```

Sem verde, não entra. Não é rigor de estilo: a rede tem dados de estudante dentro.

**O que o projeto espera do código:**

- **Código em inglês, comunicação em português.** Identificadores e nomes de coluna em
  inglês; comentários, mensagens ao usuário e documentação em português.
- **Comentário explica por quê, não o quê.** Se ele parafraseia a linha abaixo, apague.
- **Commits em [Conventional Commits](https://www.conventionalcommits.org/pt-br/)**, sem
  trailer de co-autor.
- **Leia o `AGENTS.md` da pasta que você vai tocar** — cada uma tem o seu, e eles registram
  as armadilhas que já custaram caro. Vários bugs deste repositório estão documentados lá
  justamente para não voltarem.
- **Toda decisão de segurança acontece em `apps/api`.** O SPA esconde botões; quem recusa é
  a API. Um PR que trate checagem no cliente como controle de acesso não entra.

**Achou uma falha de segurança?** Não abra PR. Veja
[Reportar uma falha](#reportar-uma-falha).

## Licença

© 2026 Matheus Agostinho. **Todos os direitos reservados.**

Este repositório é publicado para **leitura, estudo e contribuição**. Não há licença de uso
concedida: clonar para desenvolver e mandar um PR é bem-vindo; operar uma cópia própria,
redistribuir ou oferecer o ConnectGSA como serviço, não.

Ao enviar uma contribuição, você concorda que ela pode ser usada neste projeto, inclusive
comercialmente. Sem isso, cada PR aceito criaria um co-titular com poder de veto sobre o
futuro do projeto — e a intenção aqui é o oposto: manter o caminho aberto para que ele
continue existindo.

Se quiser usar alguma coisa daqui em outro contexto, é só perguntar.
