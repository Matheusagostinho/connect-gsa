# apps/web — o SPA do ConnectGSA

Vite + React 19 + Tailwind 4 + TanStack Query. Build **estático**, publicado no Firebase
Hosting.

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
5. **A cidade vem de lista, nunca do GPS.** O `Permissions-Policy` do Firebase Hosting
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
   registrada pela API lá.

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

O plano gratuito do Firebase Hosting dá **360 MB/dia** de transferência, e ao estourar o
site é **desligado** até o mês virar. Daí duas decisões no código: o React fica em chunk
próprio (uma correção no app não invalida o cache dele no navegador de ninguém) e o
autocompletar busca no servidor em vez de baixar os 5.571 municípios. Se o tráfego crescer,
a saída é pôr um CDN gratuito na frente do domínio — não é aumentar o bundle.

## Testes

Vitest + Testing Library em ambiente jsdom. Teste comportamento visível (o que a pessoa vê
e clica), não implementação — `screen.findByText('tela de login')`, não o estado interno do
roteador.
