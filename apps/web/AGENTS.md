# apps/web — o SPA do ConnectGSA

Vite + React 19 + Tailwind 4 + TanStack Query. Build **estático**, publicado na
Vercel.

## Por que SPA e não Next.js

O aplicativo inteiro fica atrás de login, então SSR e SEO não teriam o que renderizar para
quem não está autenticado — o principal argumento do Next.js não se aplica aqui. Com a API
no Fastify, o Next.js ainda obrigaria a manter duas camadas de busca de dados. Sendo
estático, o custo de hospedagem cai a zero e não há cold start.

O único custo real do SPA é prévia de link (rastreador não executa JavaScript), e isso é
resolvido pela rota `/s/profile/:id` na API — não por um framework.

## Regras que não são estilo

1. **Nada de token no navegador.** A sessão é cookie `httpOnly`; o SPA não tem e não deve
   ter token para guardar (P-008). Por isso `api.ts` usa `credentials: 'include'` em toda
   chamada. Um `localStorage.setItem('token', …)` aqui quebra o lint e a auditoria.
2. **`ProtectedRoute` é experiência de uso, não segurança.** Quem forjar a navegação
   encontra a mesma recusa no servidor. Nunca trate uma checagem do cliente como controle
   de acesso.
3. **Validação vem de `@connect-gsa/shared`.** O formulário usa o MESMO schema Zod que a
   API. Reescrever a regra no cliente é como as duas pontas divergem em silêncio.
4. **Componente não usa hexadecimal cru.** Só as variáveis de `styles/tokens.css`.
5. **A cidade vem de lista, nunca do GPS.** O `Permissions-Policy` do `vercel.json`
   inclusive nega `geolocation=()` para o navegador inteiro (P-001).
6. **Reação é ícone desenhado, nunca emoji.** Há sistema Linux sem fonte de emoji
   instalada, onde o caractere vira quadrado vazio — e o rótulo continua junto porque
   "Bora junto" e "Posso ajudar" são intenções que desenho nenhum comunica sozinho. A cor
   de cada uma mora em `REACTION_META`, no pacote compartilhado: é o mesmo dado que a API
   usa para descrever a reação, e não um valor solto no componente.
7. **A fileira de reações abre por clique, não por hover.** Hover não existe em celular nem
   no teclado, e as reações de intenção — o diferencial desta rede — ficariam inalcançáveis
   para metade das pessoas. O botão grande aplica "Decolou" num toque; o chevron abre o resto.
8. **Sair zera o cache do React Query antes de navegar.** Sem isso, o feed e o perfil da
   pessoa anterior ficariam em memória e apareceriam por um instante para quem entrasse
   depois — num produto feito para computador compartilhado de laboratório, é o pior lugar
   possível para um vazamento.
9. **O worker do MapLibre é copiado à mão para `public/`.** Ele importa um módulo irmão;
   deixar o empacotador copiar só um dos dois quebra o import DENTRO do worker, e o mapa
   fica cinza sem erro nenhum. Ver `scripts/copiar-worker-do-mapa.mjs` — e não troque por
   `?url` nem por `?worker` sem verificar os tiles no build de PRODUÇÃO, porque em
   desenvolvimento o problema não aparece.
10. **O mapa é carregado sob demanda** (`lazy` + `Suspense`). Ele pesa mais que todo o
    resto do aplicativo junto, e o plano gratuito do Hosting cobra isso em transferência.
11. **A navegação é uma estrutura só, com dois arranjos.** `AppShell` decide por consulta
    de mídia: coluna lateral no computador, barra inferior no celular. Os destinos vêm de
    `lib/navigation.ts` — se um deles existisse só num dos arranjos, sumiria no outro sem
    ninguém perceber.
12. **O mapa não fixa a própria altura.** Ela vem do contêiner (`FullBleed`), senão sobra
    uma faixa vazia embaixo. Há teste estrutural impedindo a volta da altura fixa.
13. **`Content-Type` só entra quando há corpo.** Anunciar `application/json` numa
    requisição sem corpo faz o Fastify recusar com "Body cannot be empty" ANTES de olhar a
    rota — o que quebrou, de uma vez só, apagar publicação, apagar comentário e desfazer
    conexão. Cada um parecia bug próprio; era um só. Ver `lib/api.ts` e seu teste.
14. **O modal da cidade é `dialog` nativo.** Ele traz foco preso, Escape e ocultação do
    resto da página sem uma linha de JavaScript — três coisas que uma `div` com aparência
    de modal costuma reimplementar errado. No celular o mapa é o FUNDO da tela e a marca,
    o sino e a conta flutuam por cima; numa tela de 390px, um cabeçalho fixo come um quinto
    do mapa.
15. **A aba "Para você" ordena, não filtra.** Afinidade impulsiona no ranking do servidor;
    filtrar deixaria a tela inicial de quem acabou de chegar vazia — e é justamente quem
    acabou de chegar que mais precisa ver a rede.

    **As abas estão ESCONDIDAS** (`MOSTRAR_ABAS = false` em `Feed.tsx`) enquanto a rede é
    pequena: com poucas pessoas, "Seguindo" fica quase vazia e a escolha entre as duas não
    tem consequência. Como "Para você" nunca filtrou nada, esconder as abas faz todo mundo
    ver a rede inteira — que é o que se quer no começo.

    Escondido na TELA, e não removido: a busca por aba, a rota e o teste do AC-099 seguem
    de pé, e o servidor nunca soube desta decisão. Voltar é trocar `false` por `true`.
16. **Existe UMA moldura: o `AppShell`.** Nenhuma página desenha o próprio
    `SideNav` — o mapa já fez isso, num contêiner sem a largura máxima das
    outras telas, e a coluna de navegação saltava oitenta pixels ao trocar de
    seção. Quem precisa de tela cheia pede `variant="immersive"`, que entrega a
    altura útil e faz o cabeçalho FLUTUAR sobre o conteúdo. Há teste estrutural
    varrendo `pages/` atrás de `<SideNav`.
17. **A largura máxima mora na COLUNA, não no `main`.** Aplicá-la só ao conteúdo
    deixava o cabeçalho esticar por toda a área livre enquanto o conteúdo ficava
    centrado embaixo — desalinhados, e a única tela onde isso não aparecia era a
    que tinha a coluna da direita ocupando a sobra.
18. **Um `dialog` nativo se centraliza com `margin: auto` nos quatro lados.**
    Declarar `mt-auto mb-0` para colar no rodapé do celular derruba junto a
    centralização horizontal — o modal da cidade encostou na borda esquerda do
    computador por causa disso. `mx-auto` explícito.
19. **Perfil próprio e de terceiro são o MESMO componente** (`ProfileView`). Eram
    dois arquivos com o bloco de identidade copiado, e já tinham divergido — o
    público mostrava campus e links, o próprio não, sem ninguém ter decidido
    isso. O que ramifica é a ação disponível, não o desenho.
20. **A reação abre por pressionar e segurar, e o gesto tem três guardas.**
    Arrastar mais de 10px cancela (senão rolar o feed abriria menus sem parar),
    `contextmenu` é bloqueado (senão o Android abre "copiar" no meio do gesto) e
    `ArrowUp` abre pelo teclado, que não tem "segurar". A terceira é a mesma
    lição do hover que já corrigimos uma vez.
21. **Hash para cor: o resto por 360 vai no FIM.** Aplicá-lo a cada passo derrete
    a entropia — `soma * 31 % 360` entra em ciclo curto, e dois identificadores
    diferentes caíam no mesmo tom na faixa do perfil.
22. **Uma largura só, e a moldura não aceita parâmetro.** Havia duas, e a
    diferença aparecia como um salto do conteúdo ao trocar de seção. Há teste
    varrendo `pages/` atrás de `width=` num `<AppShell>`.
23. **Publicação não é cartão.** Numa lista longa, um cartão por post vira uma
    sequência de caixas com sombra e o olho passa a contar molduras em vez de
    ler. Fio separa; moldura isolaria.
24. **`public/` só é lido pelo servidor de desenvolvimento quando ele começa.**
    Se `public/maplibre/` nasceu DEPOIS de o `pnpm dev` subir, o
    `maplibre-gl-shared.mjs` volta como `index.html` com `text/html`, o worker
    morre ao importar e o mapa fica sem um único tile — o mesmo sintoma de
    sempre, agora por cache do servidor e não por arquivo faltando. Reiniciar o
    dev resolve; antes de investigar o código, confira o `Content-Type`.
25. **`scrollbar-gutter: stable` no `html`.** O feed rola e tem barra; o
    diretório e o mapa não têm. Sem a calha reservada, o contêiner centralizado
    se desloca por metade da largura da barra a cada navegação — pequeno,
    constante e invisível em navegador de barra sobreposta, que é onde o
    Chromium dos nossos testes roda. Só o usuário percebia.
26. **`-z-10` joga o elemento para trás do fundo do PRÓPRIO ancestral.** Foi o
    que fez a nuvem de pixels da apresentação simplesmente não aparecer. O
    padrão é `z-0` no decorativo, `z-10` no conteúdo e `isolate` no contêiner —
    que prende o empilhamento ali e o impede de competir com o cabeçalho fixo.
27. **Os três estados do laço são visíveis, e nenhum é a ausência de algo.** O
    botão de conectar sumir depois do toque não diz se o pedido saiu, se falhou
    ou se as duas pessoas já eram conexão — e sumir era justamente o que
    acontecia quando conectar ACEITAVA um pedido que já esperava do outro lado.
28. **Avatar recua para a inicial quando a foto não carrega.** Um arquivo que
    sumiu do armazenamento virava o ícone de imagem quebrada do navegador, que
    é pior que não ter foto: parece defeito do produto.
29. **`<canvas>` tem tamanho intrínseco de 300×150.** `inset-0` não estica
    elemento com dimensão própria — `width: auto` num elemento substituído
    resolve para a dimensão dele, não para a caixa que o contém. Sem `size-full`
    a nuvem nasce minúscula no canto, e por ser transparente ninguém vê que ela
    está lá. E `w-full` não basta em página com calha de barra reservada: são
    quinze pixels a menos que a janela, e a nuvem termina numa faixa vazia.
    `w-screen` cobre a calha; a rolagem horizontal é barrada por `overflow-x:
    clip` no invólucro.
30. **Animação em canvas se reconstrói sozinha quando o tamanho muda.** O
    `ResizeObserver` cobre o caso normal, mas abrir as ferramentas de
    desenvolvimento, mudar o zoom ou entrar em tela cheia podem escapar dele —
    e a malha fica do tamanho antigo. Duas comparações de inteiro por quadro é
    barato demais para não fazer.
31. **Avatar quebrado tem recuo em DOIS lugares.** O componente `Avatar` e o
    pino do mapa, que monta `<img>` à mão porque marcador do MapLibre não passa
    pelo React. Corrigir só um deixa o defeito vivo no outro.
32. **A tela `/dev` só existe fora de produção.** Ela está atrás de `import.meta.env.DEV`,
   então o Vite a remove do build de produção — e a rota que a alimenta nem sequer é
   registrada pela API lá. Cuidado ao depurar um build: `import.meta.env.DEV` é falso em
   QUALQUER `vite build`, inclusive com `--mode development`. Para entrar num bundle de
   produção, chame `/api/dev/login` direto.
33. **A marca existe em DOIS arquivos.** `components/Logo.tsx` (SVG inline, acompanha o
   tema) e `public/logo.svg` (arquivo, para o ícone da aba e o README, que não executam
   React). São o mesmo traço, e a única defesa contra divergirem é o comentário cruzado em
   cada um.
34. **A fonte é servida do próprio domínio**, de `public/fonts/`, e não do CDN do Google.
   Não é preferência: é o mesmo argumento que escolheu o OpenFreeMap — numa rede de
   estudantes, não entregar IP e User-Agent a um terceiro a cada visita. Só os subsets
   latinos, e o download roda À MÃO (`scripts/baixar-fontes.mjs`) com o resultado
   versionado. No build, um Google Fonts fora do ar viraria um build quebrado.
35. **A API é servida pela MESMA origem, por um rewrite da Vercel.** `/api/*` é
    repassado para o serviço no Render. Isso não é otimização: com o SPA e a API
    em sites diferentes, o cookie que o Better Auth usa para guardar o `state` do
    OAuth é gravado numa requisição CROSS-SITE — ou seja, é cookie de terceiro, e
    o navegador o descarta. O sintoma foi `State not persisted correctly`, e não
    havia configuração que resolvesse: a causa é a origem.

    Com o proxy, tudo é primeira parte. `COOKIE_SAME_SITE` volta a `lax`, o CORS
    some do caminho e o `connect-src` da CSP fica só com `'self'`.

    **A ordem dos rewrites importa:** o `/api/:caminho*` vem PRIMEIRO, e `api/`
    entrou na exclusão do catch-all do SPA. Sem isso, toda chamada de dados
    receberia o `index.html` com status 200 — e o cliente tentaria interpretar
    HTML como JSON.

36. **A CSP mora no `vercel.json` e tem um marcador que PRECISA ser trocado**:
   `API-DA-SUA-INSTALACAO` em `connect-src` (o host do serviço no Render) e
   `MIDIA-DA-SUA-INSTALACAO` em `img-src` (o host de LEITURA do bucket R2, o
   `pub-….r2.dev`). Os dois falham CALADOS — o primeiro deixa o SPA sem servidor, o
   segundo transforma toda foto de perfil na inicial.

    **O `vercel.json` não pode explicar isso sozinho.** A Vercel valida o arquivo contra um
    schema e RECUSA o deploy se houver qualquer chave desconhecida — inclusive a convenção
    `"//"` usada como comentário, que o `firebase.json` aceitava. Por isso o aviso mora
    aqui e no README, e não ao lado do valor. Se você adicionar campo novo lá, confirme que
    ele existe no schema antes de enviar.

    Se for mexer na política, verifique num navegador com **o mapa aberto**: o worker do
    MapLibre e as tiles do OpenFreeMap são o que ela mais tem chance de quebrar, e o
    sintoma é o mapa cinza que este projeto já conhece.
37. **`REPOSITORIO` mora em `lib/projeto.ts`.** O endereço aparece na coluna de navegação
   e em Configurações — dois literais iguais viram um desatualizado no dia em que o
   repositório mudar de lugar.

## O service worker: três coisas que não são escolha

`public/sw.js` é escrito à mão e servido sem passar pelo empacotador.

1. **Ele precisa viver na RAIZ.** O escopo de um service worker é a pasta em que
   ele é servido — de `/assets/sw-a1b2.js` ele controlaria só `/assets/`.
2. **O nome não pode ter hash.** O navegador compara o arquivo byte a byte com o
   que já registrou para decidir se há versão nova; um nome que muda a cada build
   registraria um worker diferente em vez de atualizar o existente.
3. **Ele não pode ser servido do cache.** O `vercel.json` manda
   `max-age=0, must-revalidate` — um SW velho em cache prende o aplicativo numa
   versão antiga, e nada no produto consegue sair dali.

**Ele NÃO guarda resposta de API**, e isso é decisão de privacidade, não de
desempenho: numa rede fechada, servir do cache um feed ou um perfil de ontem é
pior que dizer "sem conexão" — a pessoa não saberia que está lendo algo velho, e
um perfil em cache sobreviveria a uma exclusão de conta (P-012).

E o registro acontece depois do `load`, nunca antes: a instalação baixa o casco
inteiro e disputaria banda com o primeiro desenho da tela.

## Aviso por notificação: o que a tela precisa perguntar antes

Três coisas precisam ser verdade, e nenhuma depende de nós. A pior é a terceira:
**no iPhone, o push só existe com o aplicativo INSTALADO na tela inicial.** O
Safari não expõe a API para uma aba comum — não recusa, simplesmente não existe.

Por isso `Settings.tsx` pergunta antes de oferecer, e explica o passo do
"Adicionar à Tela de Início" quando detecta iOS sem instalação. Um botão que não
faz nada faria metade dos embaixadores concluir que o recurso está quebrado.

A permissão é pedida de dentro de um gesto da pessoa — navegadores recusam o
pedido automático, e com razão.

## O cadastro inicial pede DUAS coisas, em duas etapas

Instituição (que põe a pessoa no diretório) e cidade (que a põe no mapa). Nada
mais — nome vem do provedor social, e curso, bio, habilidades, links e nome de
usuário ficam para o perfil, quando ela já viu para que a rede serve.

Eram seis campos obrigatórios numa tela só. Formulário longo na porta de entrada
é onde as pessoas desistem, e nada ali era necessário para a rede funcionar para
elas: um perfil sem curso ainda encontra e é encontrado.

Duas coisas aqui não são estilo:

- **"Voltar" é `type="button"`.** Dentro de um `<form>`, botão sem tipo é
  `submit` por padrão — voltar enviaria o cadastro pela metade.
- **O aviso do mapa mora na etapa da CIDADE**, não no rodapé. Ele é a
  contrapartida de o mapa vir ligado (P-011) e precisa ser lido no momento da
  escolha, não depois de rolar a tela.

O MESMO componente serve ao cadastro e à edição: `editando` mostra tudo de uma
vez, sem etapas. São dois arranjos de um formulário só — separá-los em dois
arquivos foi o que já fez o perfil próprio e o público divergirem sem ninguém
decidir isso.

## Interface otimista: o que aplica na hora e o que espera

Reagir, apagar publicação, comentar e salvar perfil aplicam ANTES da resposta do
servidor, e desfazem com aviso se ele recusar. Três coisas aqui não são estilo:

1. **`onMutate` cancela as buscas em voo antes de mexer no cache.** Sem isso,
   uma busca que já estava a caminho termina depois e sobrescreve o valor
   otimista com o estado anterior do servidor — o toque "desfaz sozinho".
2. **O rollback guarda o cache inteiro, não o campo.** As duas abas do feed
   guardam o mesmo post; devolver só uma deixa a outra com o valor errado.
3. **Desfazer em silêncio é pior que a espera que isto substitui.** A pessoa
   veria o próprio gesto revertido sem explicação e concluiria que o aplicativo
   é instável. Daí o `useToast` em todo `onError`.

**O que NÃO é otimista, e por quê:**

- **Publicar com imagem.** O envio pode falhar por tamanho ou tipo, e mostrar o
  post "publicado" para removê-lo depois é pior que esperar.
- **O comentário na lista.** Só a CONTAGEM sobe: o texto passa por sanitização
  no servidor, e mostrar o que a pessoa digitou para trocá-lo depois seria pior
  que mostrar um instante mais tarde.
- **Salvar perfil quando o nome de usuário mudou.** Só o servidor sabe se ele
  está livre e se o intervalo entre trocas passou. Navegar e avisar por toast
  faria a pessoa perder dez campos preenchidos para corrigir um.

A regra da reação mora numa função PURA (`lib/reacao-otimista.ts`), com teste
para cada um dos três caminhos. Havia uma decisão contrária aqui, com a
justificativa de que "adivinhar qual dos três aconteceu é como a contagem
diverge do banco" — a preocupação era certa e a premissa não: os três são
determinísticos a partir do que a tela já sabe. E a resposta do servidor
sobrescreve o cálculo, então divergir continua impossível.

## Carregamento: contorno, não texto

`Skeleton.tsx` desenha o espaço que o conteúdo vai ocupar. Um "Carregando…"
centralizado some e é substituído por uma tela cheia — e o salto move o que a
pessoa já estava lendo.

As medidas do contorno imitam o conteúdo real de propósito. Um contorno que não
tem a altura final causa o mesmo salto que ele deveria evitar.

O brilho é `motion-safe:`, e o contorno é `aria-hidden`: quem navega por áudio
não se beneficia de doze retângulos cinza anunciados um a um. O que serve a essa
pessoa é o `aria-busy` na região.

## Design system

Linguagem visual derivada do **antigravity.google**: superfície limpa, tinta quase preta,
botões sólidos em pílula, muito respiro (ritmo de 8px, goteira de 72px) e cor aparecendo
só como acento. Tipografia **Google Sans** — publicada sob SIL Open Font License desde
janeiro de 2026, então não há pendência de licença.

Tudo mora em `styles/tokens.css`. Três coisas ali não são preferência:

1. **A paleta clara vive no `:root` puro.** É o padrão mesmo sem JavaScript. O escuro é
   redefinido duas vezes de propósito — por `prefers-color-scheme` (guardado contra uma
   escolha explícita de claro) e por `data-theme` — para o alternador vencer nos dois
   sentidos.
2. **`spark-text` não usa o amarelo.** Medido: `#FBBC04` dá **1,71:1** sobre branco,
   abaixo do mínimo de 3:1 até para texto grande. Azul, violeta e vermelho passam nos dois
   temas. O gradiente de quatro cores (`spark-gradient`) fica só em decoração — avatar e
   marcador — onde não há texto.
3. **`applyStoredThemeEagerly()` roda antes do React montar.** Sem isso, quem escolheu o
   tema escuro leva um clarão branco a cada carregamento.

**Estética sim, identidade não:** sem logotipo do Google, sem tratamento que imite a marca,
e o aviso de projeto não oficial no rodapé enquanto a Q-003 estiver aberta.

Checklist antes de entregar tela nova: alvo de toque ≥ 44px, contraste ≥ 4,5:1 (3:1 para
texto grande), foco visível, rótulo visível (nunca placeholder como rótulo), erro junto do
campo, `prefers-reduced-motion` respeitado, testado em 375/768/1024/1440px **e nos dois
temas**.

## Cuidado com a cota

O plano gratuito da Vercel dá **100 GB/mês** de banda. Daí duas decisões no código: o React
fica em chunk próprio (uma correção no app não invalida o cache dele no navegador de
ninguém) e o autocompletar busca no servidor em vez de baixar os 5.571 municípios.

O que aperta primeiro, porém, não é a banda: é a **hibernação do Render**. Sem tráfego por
~15 min a API dorme e a primeira requisição espera ~50 s — e nenhuma otimização de bundle
resolve isso, porque o problema está do outro lado. Ver README, "Colocar no ar", Passo 8.

## Testes

Vitest + Testing Library em ambiente jsdom. Teste comportamento visível (o que a pessoa vê
e clica), não implementação — `screen.findByText('tela de login')`, não o estado interno do
roteador.
