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

## Design system

Paleta "Membership/Community" (roxo `#7C3AED` + verde `#16A34A`), da base da skill
`ui-ux-pro-max`. Escolhida por casar com o tipo de produto e por **não** usar nenhuma cor
da marca Google — enquanto o aval do programa estiver em aberto, parecer oficial sem ser é
o risco a evitar. Tipografia Inter em família única.

Checklist antes de entregar tela nova: alvo de toque ≥ 44px, contraste ≥ 4,5:1, foco
visível, rótulo visível (nunca placeholder como rótulo), erro junto do campo,
`prefers-reduced-motion` respeitado, e testado em 375/768/1024/1440px.

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
