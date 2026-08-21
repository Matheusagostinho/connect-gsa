# apps/api — a API do ConnectGSA

Fastify 5 + Better Auth + Prisma + CASL. **Toda decisão de segurança do produto mora
aqui.** O SPA esconde botões; esta pasta é quem recusa requisições.

## Estrutura

```
src/
├── app.ts              monta a aplicação (sem abrir porta — é o que permite testar)
├── server.ts           ponto de entrada de produção
├── env.ts              contrato das variáveis de ambiente (falha ao subir se faltar)
├── types.ts            AppInstance — Fastify já ciente do provedor de tipos do Zod
├── plugins/
│   ├── security.ts     helmet, CORS por lista, rate limit, cookie
│   └── errors.ts       AppError + tratamento central (não vaza stack em produção)
├── auth/
│   ├── better-auth.ts  provedores sociais, vínculo de contas e O PORTÃO da rede
│   ├── signed-ticket.ts assinatura HMAC genérica com prazo
│   ├── invite-ticket.ts bilhete que atravessa o vaivém do OAuth
│   ├── dev-login.ts    porta dos fundos de desenvolvimento, travada contra produção
│   └── session.ts      resolve a sessão e expõe `request.currentUser`
├── authz/              CASL: quem pode o quê
├── modules/
│   ├── invite/         geração e conferência de convites, e a indicação
│   ├── profile/        perfil, sanitização e o mapper que nunca devolve e-mail
│   ├── media/          reprocessamento de imagem e drivers de armazenamento
│   ├── post/           posts, reações e comentários
│   ├── feed/           ranking (função pura) e montagem paginada do feed
│   └── share/          prévia Open Graph para link colado no WhatsApp
└── routes/             health, repasse do Better Auth, dados de referência
```

## Onde cada rota mora

| Prefixo | O que é |
|---|---|
| `/health` | sonda de infraestrutura — o Render consulta esta URL, e o ping que impede a hibernação também. **Fora do prefixo `/api` de propósito:** ela não passa pelo proxy da Vercel, e um ping que morresse lá não acordaria a API |
| `/s/...` | link de compartilhamento, que vai colado em conversa |
| `/api/auth/*` | Better Auth (o `basePath` dele já inclui o prefixo) |
| `/api/*` | todo o resto do aplicativo |

O prefixo único em `/api` é o que permite ao SPA usar caminho relativo em desenvolvimento
(com o proxy do Vite) e URL absoluta em produção, sem cada rota precisar saber qual é o
caso. Ao adicionar rota do aplicativo, registre-a **dentro** do escopo com prefixo.

## O login de desenvolvimento

`auth/dev-login.ts` é uma porta dos fundos deliberada: quem alcança a rota entra como
qualquer usuário. Ela é travada em três camadas, e nenhuma depende de alguém lembrar:

1. `assertDevOnly` **lança** se `NODE_ENV=production`, e roda no momento do registro — a
   API se recusa a subir, em vez de abrir uma brecha silenciosa.
2. O `app.ts` só registra essas rotas fora de produção.
3. `dev-login.test.ts` prova as duas coisas, inclusive que `/api/dev/*` responde 404 numa
   aplicação montada em modo produção.

A trava é o `NODE_ENV` de propósito. Uma variável própria (`ENABLE_DEV_LOGIN`) seria pior:
mais uma coisa para alguém copiar sem querer para o ambiente errado.

## O ranking do feed

`modules/feed/ranking.ts` é uma **função pura**: sem banco, sem `Date.now()` implícito, sem
sessão. Foi assim de propósito — cada regra vira um teste de uma linha, e o dia em que o
feed "ficar estranho" a investigação começa ali, não numa consulta SQL de trinta linhas.

O raciocínio veio do `xai-org/x-algorithm`, **sem copiar os pesos**: lá eles multiplicam
probabilidades previstas por um modelo, aqui temos contagens. Copiar a tabela produziria
ordenação sem sentido, e o próprio comentário do código deles avisa isso.

### As duas abas

`buildFeed` recebe `tab`. **"Seguindo" filtra** — só conexões e o próprio perfil, porque um
feed de conexões sem o que você mesmo publicou parece quebrado. **"Para você" NÃO filtra**:
a afinidade entra como impulso no ranking (`PROXIMITY_BOOST`), nunca como cláusula `where`.
Um filtro rígido deixaria a tela inicial de quem acabou de chegar completamente vazia — e é
justamente quem acabou de chegar que mais precisa ver a rede. Há teste (AC-099) impedindo
essa regressão.

Habilidade em comum tem **teto** (`sharedSkillsCap`): sem ele, quem cadastra vinte
habilidades apareceria acima de todo mundo para todo mundo, e a afinidade viraria ruído.

O cursor do feed carrega o **instante da montagem**, não a data do último post. Como a
ordenação é por nota e não por data, um post publicado entre uma página e outra se
intercalaria no meio da lista — e você veria de novo o que já viu. Congelar o instante é o
que torna a página 2 uma continuação real da página 1.

## Convites

**Todo embaixador convida.** Antes era privilégio da coordenação, e o botão era
invisível para quase todo mundo. Quem conhece outro participante do programa é
quem está NELE.

O teto por período (`INVITE_QUOTA`) vive no SERVIÇO, não no CASL: o CASL decide
sobre o que já está em memória, e contar convites criados exige ir ao banco. Ele
conta convites **criados**, não usados — contar usados deixaria alguém gerar cem
links de uma vez, e o teto só apareceria depois do estrago.

**Oito caracteres**, de um alfabeto de 32 sem I, L, O e U. O raciocínio completo,
com os números que descartaram cinco caracteres, está no `inviteCodeSchema`. O
sorteio usa `randomInt` do `node:crypto` — `randomBytes` com resto por 32
pareceria equivalente e enviesaria o alfabeto no dia em que alguém tirasse uma
letra dele. Há teste provando que todos os 32 símbolos saem.

`GET /invites/:code` devolve **só o primeiro nome** de quem convidou. Nome
completo transformaria o link num jeito de descobrir quem está na rede sem
entrar nela. E a recusa é a MESMA para não existe e expirado: distinguir os dois
entregaria de graça o oráculo que o limite de tentativas nega.

### O convite não é mais de uso único — leia antes de mexer

Até 20/08/2026 a reserva era um compare-and-set atômico (`updateMany` com
`usedAt: null` no filtro), e era o Postgres quem deixava exatamente uma
requisição passar. **Isso não existe mais.** Foi decisão do dono do produto, com
o custo apresentado antes, e está registrada no P-009 e em
`.spec/features/convite-aberto/`.

O que mudou no código, e o que cada nome quer dizer agora:

- `claimInvite` virou **`resolveInvite`**. Nada é reservado: a função só confere
  o formato e o prazo. Manter "claim" no nome seria mentir sobre o que ela faz.
- `releaseInvite` **sumiu**. Não há reserva a devolver — e ela já era código
  morto antes disso.
- `usedAt` virou `lastUsedAt`, e é gravado em `attachInviteToUser`, não na
  conferência. Marcar na conferência dataria convites de cadastros que nunca
  aconteceram.

**O que segura o portão agora é o PRAZO**, e só ele. Encurtar
`INVITE_VALIDITY_DAYS` aperta; alongar afrouxa. Não há outra camada por baixo, e
é por isso que **revogar convite** é a próxima fatia: sem uso único, revogar é o
único jeito de estancar um link vazado antes do prazo.

Se você for mexer aqui achando que "convite é de uma pessoa só", pare e leia o
P-009 primeiro.

## Indicação

`User.invitedById` grava quem trouxe cada pessoa. Ele **não** é o mesmo que
`User.invitedViaId` (por qual convite ela entrou): o primeiro é permanente, o
segundo morre com o convite. `packages/db/AGENTS.md` tem a tabela dos dois.

`attachInviteToUser` grava tudo numa transação, e a leitura de `createdById` sai
do próprio `update`. Ler antes, fora da transação, abria uma janela: se quem
convidou excluísse a conta entre a leitura e a escrita, a chave estrangeira
recusava e **o cadastro inteiro falhava** — o portão fechando na cara de quem
tinha convite válido.

Convite que a pessoa gerou para si mesma não a indica. Ninguém a trouxe, e
registrar o contrário seria gravar um fato falso — que vira ponto falso quando
houver gamificação.

## Nome de usuário

O slug nasce derivado do nome e a pessoa **pode** trocá-lo — o que contraria a
decisão original de nunca reescrevê-lo. Aquela decisão tinha razão, e por isso a
troca vem com duas defesas: o endereço anterior fica em `previousSlug` e continua
encontrando o perfil, e há intervalo mínimo entre trocas.

`previousSlug` é `@unique` de propósito: enquanto ele responde, ninguém mais pode
tomá-lo. Um link antigo levando ao perfil ERRADO é pior que um link que não leva
a lugar nenhum.

Guardamos **um só** endereço anterior. É por isso que o intervalo existe: trocar
duas vezes seguidas jogaria fora justamente o que mais circulou.

Salvar o perfil sem mexer no campo não conta como troca — o cliente só manda
`slug` quando ele mudou. Sem isso, editar a bio duas vezes esgotaria o intervalo.

## Contagens do perfil

`connectionCount` e `postCount` são **consultados**, não guardados em coluna.
Contador denormalizado paga por si onde é lido a cada item de uma lista — o caso
do feed —, mas aqui é lido uma vez por visita a um perfil, e o preço passa a ser
manter dois lugares em sincronia para sempre. Divergir é questão de tempo, e um
número errado no perfil é pior que uma consulta a mais.

Só laço **aceito** conta como conexão: pedido pendente é intenção de um lado só.
E só publicação `kind: 'feed'` conta — comunicado oficial pertence à coordenação,
e contá-lo inflaria o perfil de quem por acaso tem o papel.

## A foto do provedor social nunca fica no provedor

O Better Auth grava `image: user.picture`, e o Google devolve
`lh3.googleusercontent.com/a/ACg8ocK…` — um caminho que carrega identificador
derivado da conta Google da pessoa. Esse campo é servido a QUALQUER participante
que veja o perfil, o diretório, o feed ou um pino do mapa. Eram dois vazamentos
num campo só: o identificador circulando pela rede, e cada avatar renderizado
virando uma requisição ao Google com o IP de quem navega.

`importarFotoDoProvedor` traz o arquivo na criação da conta e passa pelo MESMO
pipeline de todo upload — decodificar os pixels, escrever arquivo novo sem
metadado. Nada de copiar bytes: o arquivo do provedor é entrada não confiável
como qualquer outra, e foto de rede social carrega EXIF com frequência (P-001).

Três guardas que não podem sair:

1. **Só `https`.** O valor vem de terceiro e quem dispara a requisição é o
   SERVIDOR — sem isso, é o começo de um SSRF.
2. **O tipo vem dos bytes**, nunca do `Content-Type` do outro lado.
3. **Falha devolve `null`, nunca lança.** Recusar o cadastro porque o Google
   demorou seria trocar um contratempo por um portão fechado; a pessoa entra sem
   foto e o avatar recua para a inicial.

A importação acontece no `before` do hook de criação: assim a linha já NASCE com
o valor certo, e não existe janela em que a URL do provedor esteve no banco.

## Imagens

Todo envio passa PELA API, não por URL assinada direto ao bucket (ASM-012). É mais lento, e
é de propósito: só assim conseguimos inspecionar o conteúdo e **reprocessar a imagem antes
de gravar**. Foto de celular carrega GPS no EXIF, e um arquivo guardado como veio entregaria
a localização exata de um estudante (P-001) — por um caminho que o schema do banco não cobre.

Não removemos "os campos ruins" do EXIF: lista de bloqueio envelhece mal. Decodificamos os
pixels e escrevemos um arquivo novo, que nasce sem metadado. O tipo vem dos **bytes**, nunca
da extensão nem do `Content-Type`, que são do cliente e não valem nada.

O destino é escolhido por driver: disco local em desenvolvimento, **Cloudflare R2** em
produção. Sem essa costura, ou o ambiente local exigiria credencial de nuvem, ou o código de
produção teria um `if` sobre ambiente por dentro. A costura já provou o valor: trocar Cloud
Storage por R2 foi um arquivo novo e uma linha no `app.ts` — nenhuma rota, nenhum serviço e
nenhuma linha do banco souberam.

O R2 fala o protocolo do S3, e é por isso que a dependência se chama `aws4fetch` sem ter
nada a ver com a Amazon: ela só assina a requisição no formato SigV4. O binding nativo do R2
seria melhor e não serve — ele só existe dentro de Cloudflare Workers.

**A mensagem de erro do driver carrega o status, nunca o corpo da resposta.** O corpo de
erro do S3 ecoa cabeçalhos da requisição assinada, e essa mensagem vai para o log (P-005).

## Quadro de avisos

`Post.kind` distingue publicação comum de comunicado oficial, e o feed filtra por
`kind: 'feed'` — se algum dia surgir outra consulta de feed, ela precisa filtrar também,
senão o comunicado volta a competir com publicação pessoal.

A autorização não é nova: reusa `manage Announcement` do CASL, que já era de moderação e
administração.

O aviso mais recente é servido separado, em `/announcements/latest`, e some do destaque
depois de 14 dias. O prazo está no código, não na tela: quem decide o que é notícia é o
servidor.

## Notificações

Não existe tabela de notificação. Pedidos, reações e comentários já estão no banco com data
e autor; o que faltava era juntá-los e saber até onde a pessoa olhou — daí
`User.notificationsSeenAt`, uma coluna.

O limite é conhecido e está escrito no serviço: a consulta cresce com o volume de
interações. Para algumas centenas de embaixadores é barata; passando de alguns milhares, o
desenho precisa virar escrita antecipada. O sinal de que chegou a hora é o tempo da rota,
não um palpite.

## Conexões

O par é guardado SEMPRE com o menor id primeiro (`canonicalPair`). Com a ordenação
canônica, o índice único do banco passa a garantir que A→B e B→A são o mesmo registro —
sem ela, seriam duas linhas e nada impediria dois pedidos opostos coexistirem.

`requestedById` guarda quem pediu, que a ordenação canônica apaga. É dele que a outra
pessoa precisa para saber que há um pedido a responder.

## Cinco coisas que não podem ser desfeitas

1. **`profile.mapper.ts` é a única saída de perfil.** Ele valida contra
   `publicProfileSchema`, que não tem campo de e-mail — então devolver e-mail passa a ser
   impossível, não apenas proibido (P-002). Não crie um segundo caminho de serialização.
2. **Toda rota declara `response` schema.** O Fastify serializa através dele; campo fora do
   schema não chega ao cliente. Remover o schema reabre o vazamento.
3. **O prazo do convite é conferido em TODA leitura** (`expiresAt: { gt: new Date() }` em
   `resolveInviteByHash`, `checkInvite` e `invitationFor`). Desde que o uso único saiu, é a
   única coisa que fecha um convite — tirar a cláusula de um desses caminhos abre a rede por
   ali, e os outros dois continuariam parecendo corretos.
4. **Recusa de convite tem mensagem única**, igual para inexistente e expirado.
   Diferenciar entrega um oráculo para quem varre códigos.
5. **O papel vem do banco a cada requisição**, nunca do cookie. Papel dentro do token seria
   escalonamento de privilégio a uma edição de distância.

## Como escrever um teste de rota

`buildTestApp()` sobe a aplicação real — mesmas rotas, mesma validação, mesma autorização —
trocando só a origem da identidade: o cabeçalho `x-test-user` em vez do cookie. Esse
resolvedor existe apenas em `src/testing/`; produção nunca o registra.

```ts
const response = await app.inject({ method: 'GET', url: '/me', headers: asUser(ana.id) });
```

Para o portão de entrada, `auth.gate.test.ts` usa o plugin `testUtils` do Better Auth, que
grava pelo `internalAdapter` — o mesmo caminho do retorno do OAuth. É por isso que aqueles
testes provam o portão, e não um mock dele.

Os testes precisam do Postgres de verdade (`docker compose up -d`): corrida de convite e
unicidade de e-mail são garantias do banco, e um mock aprovaria implementações erradas.

Eles usam um banco **separado** (`TEST_DATABASE_URL`), porque `resetTestData` apaga tabelas
inteiras. `testing/db.ts` se recusa a rodar se ele for igual ao de desenvolvimento — o
estrago seria silencioso: os testes passariam e você só descobriria ao voltar para a tela.

## Texto livre: dois sanitizadores, e usar o errado destrói conteúdo

`sanitizeText` achata `\s+` para um espaço — certo para nome, bio e rótulo de
habilidade, que são campos de UMA linha.

`sanitizeMultiline` preserva a quebra de linha e é o que publicação e comentário
usam. Quem escrevia em parágrafos via tudo virar uma linha só justamente porque
o primeiro era usado nos dois casos, e o defeito estava na ENTRADA — a exibição
já usava `whitespace-pre-wrap`.

Os dois mantêm a política de tags como lista de PERMISSÃO vazia: remover todas,
nunca enumerar as perigosas (P-006). Ao criar um campo de texto novo, a pergunta
é "isto tem parágrafos?", não "qual dos dois está mais à mão".

`QUEBRAS_SEGUIDAS_MAX` conta QUEBRAS, não linhas vazias: duas quebras deixam uma
linha em branco. O nome anterior contava uma coisa e dizia outra.

## O que a API se recusa a fazer em produção

Três travas, e nenhuma depende de alguém lembrar:

1. **Sem as cinco variáveis do R2, a API não sobe** (`env.ts`): `MEDIA_BUCKET`,
   `MEDIA_PUBLIC_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` e
   `R2_SECRET_ACCESS_KEY`. O disco do contêiner é efêmero — e no plano gratuito
   do Render, que hiberna por inatividade, "reiniciou" não é evento raro: é toda
   madrugada. Sem bucket, as fotos sumiriam de um dia para o outro sem nada no
   log. Isto já foi um aviso no README, e aviso em README não é trava.
2. **As rotas `/api/dev/*` não são registradas**, e `assertDevOnly` lança se
   alguém tentar.
3. **`COOKIE_SAME_SITE` decide se o login funciona.** `lax` só serve quando o
   SPA e a API estão no mesmo site (mesmo domínio registrável). **Com o SPA na
   Vercel e a API no Render, precisa ser `none`** — `vercel.app` e `onrender.com`
   são sufixos públicos diferentes. Cross-site com `lax`, o cookie é aceito na
   volta do OAuth e some nas chamadas de dado: o aplicativo abre deslogado sem
   um erro sequer. Em desenvolvimento nunca acontece, porque o proxy do Vite faz
   tudo ser `localhost`. O dia de voltar para `lax` é o dia do domínio próprio.

## A lista aprovada é minúscula, e o banco garante

`isEmailAllowed` faz `trim().toLowerCase()` no e-mail que CHEGA do provedor. Nada
normalizava o que estava GRAVADO — e uma linha com maiúscula nunca casa com
ninguém. A pessoa é recusada no portão com "acesso restrito", sem uma pista de
que a causa é uma letra numa tabela.

Aconteceu no primeiro acesso em produção. Agora há uma `CHECK` no banco, e ela
recusa a inserção em vez de consertar em silêncio: consertar calado esconde de
quem inseriu que ele digitou errado, e esta é a lista que controla quem entra.

## Uma falha intermitente ainda não explicada (2026-08-20)

`moderation.test.ts` (AC-078) falhou **uma vez** durante um laço que roda a suíte
inteira quinze vezes seguidas. Não reproduz isolado (3 execuções) nem na suíte
completa (5 execuções). Se você encontrar, isto é o que já foi descartado:

- **Não é o teto de requisições.** `RATE_LIMIT_MAX` é elevado nos testes desde a
  correção do mesmo dia, e o sintoma seria `TOO_MANY_REQUESTS`, que não apareceu.
- **Não é o instante congelado do cursor do feed.** O filtro é `lte: geradoEm`,
  inclusivo — um post criado no mesmo milissegundo entra.

A pista que sobra é o teste depender de `feed()` devolver as DUAS publicações
recém-criadas: se uma faltar, o `find` devolve `undefined` e o `toMatchObject`
falha com uma mensagem que não explica nada. Um `expect(visto).toHaveLength(2)`
antes das asserções transformaria o próximo caso numa mensagem útil — vale fazer
quando alguém tocar neste arquivo.

Está registrado aqui, e não escondido, porque um teste que falha às vezes ensina
a ignorar o vermelho.

## A imagem: duas armadilhas que davam verde falso

**1. O `.dockerignore` mora na RAIZ do repositório, não ao lado do Dockerfile.**
O Docker lê o `.dockerignore` da raiz do CONTEXTO, e o contexto aqui é o
repositório inteiro. Havia um `apps/api/.dockerignore` que nunca foi lido — e o
efeito foi pior que não ter nenhum: o `dist/` compilado na máquina de quem rodava
o build era copiado para dentro da imagem. **O build passava local e falhava no
servidor**, que clona limpo. Se você mexer no contexto, teste com `--no-cache`.

**2. Cada pacote é compilado pelo próprio script `build`**, nunca por um `tsc -b`
solto. `tsc -b` sem argumento usa `tsconfig.json`, que tem `noEmit: true` porque
serve ao typecheck: ele não emite nada, o `dist` do `@connect-gsa/db` não nasce,
e a API falha com "Cannot find module '@connect-gsa/db'" seguida de dezenas de
erros de `any` — que são só a cascata do primeiro. Quem sabe compilar cada
pacote é o `package.json` dele.

Antes de confiar num build de imagem, rode-o: `docker run --rm <imagem>` precisa
chegar à validação de ambiente e reclamar das variáveis. Se falhar antes disso,
o `dist` está incompleto.

## Os tetos de entrada, e onde cada um mora

| Teto | Onde | Por quê |
|---|---|---|
| `bodyLimit: 64 KB` | `app.ts` | Corpo JSON. A maior publicação tem mil caracteres; o padrão do Fastify (1 MB) era generoso sem motivo. Imagem NÃO passa por aqui |
| `imageBytesMax: 4 MB` | `POST_LIMITS` | Imagem, via multipart. É o mesmo valor usado no plugin — dois números parecidos em lugares diferentes viram um desatualizado, e aí o multipart aceita o que a rota recusa |
| `mediaKeySchema` | `post.schema.ts` | FORMATO da chave, não só tamanho. O cliente escolhe esse valor ao publicar: sem formato ele apontaria para qualquer objeto do bucket — ou para fora dele |
| `RATE_LIMIT_MAX` | `env.ts` | Piso global por minuto, por IP quando não há sessão |

O teto de imagem não é só de armazenamento: **toda imagem é decodificada** na API
para ser reprocessada sem metadado, e decodificar é onde a memória vai. Num
contêiner pequeno, alguns envios grandes simultâneos derrubam o processo.

## Parâmetro com padrão esconde dado errado

`toPost` recebe `connection` como último parâmetro com padrão `'none'`. O feed
monta os posts por um caminho próprio e esquecia de passá-lo — e o resultado não
foi erro, foi **dado errado em silêncio**: todo post dizia "não conectado", e a
tela oferecia conectar com quem já era conexão.

Não houve erro de tipo, de lint nem de teste. Só o sintoma na tela, semanas
depois, relatado por quem usava.

A lição vale além deste caso: **quando o valor omitido é plausível, o padrão
deixa de ser conveniência e vira armadilha.** Um parâmetro obrigatório teria
quebrado a compilação na hora. Se você criar um caminho novo que monte `Post`,
confira o que ele passa — e cubra com teste, como o `feed.routes.test.ts` faz
para `connected` e `self`.

## Armadilhas conhecidas

- `fileParallelism: false` no `vitest.config.ts`: os testes compartilham um Postgres, e
  arquivos em paralelo limpariam tabelas uns dos outros.
- `trustProxy: true` é obrigatório atrás do proxy do Render — sem ele o rate limit veria o
  IP do balanceador e trataria a internet inteira como um cliente só.
- `parseEnv` lista apenas os **nomes** das variáveis inválidas, nunca os valores (P-005).
