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
6. **Nenhuma reação depende só do emoji.** A fileira mostra emoji **e** rótulo. Dois
   motivos: "Bora junto" e "Posso ajudar" são intenções que emoji nenhum comunica sozinho,
   e há sistema Linux sem fonte de emoji instalada, onde o ícone vira quadrado vazio.
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
13. **A tela `/dev` só existe fora de produção.** Ela está atrás de `import.meta.env.DEV`,
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
