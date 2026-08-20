# Roadmap do ConnectGSA

> Situação em 20 de agosto de 2026 · 347 testes · 137/137 critérios de aceite provados

Este documento compara o que o MVP prometeu com o que existe hoje, e ordena o que falta.
A ordem não é por tamanho nem por vontade: começa pelo que é **exigência legal**, passa
pelo que **destrava o lançamento**, e só então pelo que aumenta engajamento.

---

## 1. O que o MVP prometeu, e onde estamos

### Perfil, busca e mapa — **completo**

| Item | Estado |
|---|---|
| Perfil: nome, foto, instituição, cidade, curso, habilidades, bio, links | pronto |
| Busca por instituição, cidade, curso e habilidade | pronto |
| Mapa com as cidades dos embaixadores | pronto |
| Escolher se aparece no mapa | pronto |

Foram além do prometido: instituições **por campus** (628 entradas, com os 38 Institutos
Federais), catálogo fechado de 78 habilidades, e perfil público em `/perfil/{slug}`.

### Feed e quadro de avisos — **completo**

| Item | Estado |
|---|---|
| Feed com ranking por engajamento, recência e diversidade de autor | pronto |
| Publicar texto e imagem | pronto |
| Reações próprias (Decolou, Aprendi, Respeito, Bora junto, Posso ajudar) | pronto |
| Comentários | pronto |
| Quadro de avisos oficiais | pronto |

Entregue na Fatia 6.

### Gamificação — **não começou**

Pontos por ação, badges e ranking opcional. Nada disso existe.

### Tempo real — **não começou**

Presença online e contadores ao vivo via Firebase Realtime Database. A decisão de adiar foi
consciente: corta um vendor, um SDK e um conjunto de regras de segurança do primeiro
lançamento.

---

## 2. O que apareceu no caminho e não estava no MVP

Entregues: conexões entre embaixadores (pedir, aceitar, recusar, desfazer), endereço público
de perfil, link de convite compartilhável, sair da conta, tema claro e escuro, notificações,
tela de configurações, página de apresentação, marca própria, e uma entrada de
desenvolvimento travada contra produção.

A navegação também mudou de forma: coluna lateral fixa no computador e barra inferior no
celular, com o mapa ocupando a tela inteira.

---

## 3. O que falta, em ordem

### ~~Fatia 4 — Exportar e excluir a conta~~ · **entregue**

LGPD, art. 18, V e VI. O P-012 deixou de ser recomendação e virou princípio obrigatório,
com verificação executável.

Duas coisas que a cascata do banco não faz sozinha, e que teriam virado defeito silencioso:
as **imagens** somem do armazenamento junto (não só as linhas — senão os arquivos seguiriam
acessíveis por URL), e os **contadores desnormalizados** das publicações de terceiros são
acertados antes da cascata (senão mentiriam para sempre).

### ~~Fatia 5 — Notificações~~ · **entregue**

Pedidos de conexão, reações e comentários nas próprias publicações, com contador de não
lidas na navegação. Derivadas do que já está no banco — sem tabela própria, só uma marca de
"visto até aqui" no usuário. Nesta escala, manter registros duplicados custa mais do que
consultá-los e abre a chance de os dois lados divergirem.

### ~~Fatia 6 — Quadro de avisos~~ · **entregue**

Comunicados oficiais que só a coordenação publica, separados do feed e em ordem cronológica
— comunicado não disputa atenção por engajamento, e um aviso importante que ninguém curtiu
afundaria.

O custo desse desenho é o quadro virar um lugar que ninguém visita. Por isso o aviso mais
recente também aparece no topo do feed, saindo do destaque depois de duas semanas: aviso
velho fixo ensina a ignorar o espaço.

### ~~Fatia 6.5 — Feed em abas e refino de interface~~ · **entregue**

Nasceu de usar o produto, não de planejamento. O defeito mais grave era silencioso e
derrubava **três fluxos de uma vez**: nenhuma exclusão funcionava pela tela — nem apagar
publicação, nem apagar comentário, nem desfazer conexão. O cliente anunciava
`Content-Type: application/json` numa requisição sem corpo e o servidor recusava antes de
olhar a rota. Cada um parecia um bug isolado; era um só.

O resto é refino, e vale registrar o que **não** é óbvio:

- **Duas abas no feed.** "Para você" **ordena** por afinidade — curso, estado, habilidade,
  instituição, cidade —, não filtra. Filtrar deixaria a tela inicial de quem acabou de
  chegar completamente vazia, e quem acabou de chegar é justamente quem mais precisa ver a
  rede. "Seguindo" filtra por conexões, e inclui as próprias publicações.
- **Sino com caixa no cabeçalho**, no celular e no computador. Abrir a caixa zera o
  contador: se não zerasse, o número estaria mentindo. Mostra cinco — mais que isso vira uma
  segunda página dentro de um menu.
- **Reações coloridas e desenhadas.** A cor sai do catálogo compartilhado, o mesmo que a API
  usa; o traço é redesenhado só na troca, e nunca para quem pediu menos movimento.
- **Conectar direto do cartão.** O momento de querer se conectar é quando algo publicado
  chamou atenção — mandar procurar o perfil perde esse momento. No celular o botão fica só
  com o ícone: com rótulo, ele comia largura suficiente para o nome virar "Carla Nog…".
- **Mapa como fundo no celular**, com a marca e a conta flutuando e a cidade abrindo em
  `dialog` nativo — que traz foco preso, Escape e ocultação do resto da página de graça.

**232 testes, 97/97 critérios provados, auditoria limpa.**

### ~~Fatia 6.6 — Perfil estilo X e reação por pressionar~~ · **entregue**

Também nasceu de usar o produto. O achado estrutural: **o mapa não passava pela
moldura do aplicativo** — desenhava a própria navegação lateral, e a coluna saía
oitenta pixels fora de lugar ao trocar de seção. A correção não foi de classe: o
`AppShell` ganhou um modo imersivo e o mapa voltou para dentro dele. Há teste
varrendo `pages/` para impedir que alguma tela volte a montar a própria moldura.

O que mais mudou, e por quê:

- **Cabeçalho fixo na coluna de conteúdo.** O sino e a conta flutuavam a
  trezentos pixels do conteúdo, parecendo do navegador e não da página.
- **Coluna da direita** em telas ≥1280px, com gente do diretório e o aviso mais
  recente. Não introduz nada novo — mostra o que a rede já serve num lugar onde
  antes não havia nada. Numa rede começando, o problema não é excesso de
  conteúdo, é não saber que tem alguém do outro lado.
- **Perfil refeito**, com as publicações da pessoa e um só componente para o
  próprio e o de terceiro. Eram dois arquivos copiados que já tinham divergido.
  Box para a identidade (uma coisa só), cards para as publicações (unidades
  separáveis).
- **Onboarding** entra na moldura quando é edição; no primeiro preenchimento
  continua sem navegação, porque toda outra seção devolveria a pessoa para cá.
- **Reação só com ícone**, e a fileira abre ao pressionar e segurar. O gesto tem
  três guardas: arrastar cancela, o menu nativo é bloqueado, e o teclado abre
  pela seta para cima.

**253 testes, 108/108 critérios provados, auditoria limpa.**

### ~~Fatia 6.7 — Refino de interface e identidade editável~~ · **entregue**

Duas mudanças de regra e um lote de desenho.

**Regra.** O feed passou a favorecer o recém-publicado: meia-vida da recência de
12h para 2h. Encurtá-la não bastou — o engajamento somado cresce linear e um post
com muitas reações continuava imbatível —, então ele entrou em **logaritmo**: a
diferença entre 0 e 5 interações continua grande, a de 40 para 80 quase some. E o
**nome de usuário virou editável**, contrariando a decisão original de nunca
reescrevê-lo; a troca vem com as duas defesas que evitam o estrago — o endereço
anterior continua respondendo, e há 30 dias entre trocas.

**Desenho.** Uma largura só para todas as telas. Publicação deixou de ser cartão.
O quadro de avisos saiu do feed, a caixa de escrever perdeu a moldura, entraram
puxar-para-atualizar e um botão de publicar que aparece ao rolar. As reações
ganharam resposta ao mouse e o "Decolou" ganhou um foguete que decola. O
diretório escondeu as 78 habilidades atrás de um painel. O perfil perdeu a capa e
ganhou compartilhar. "Conexões" saiu da navegação — pertence ao perfil.

Dois defeitos apareceram no caminho: **editar o perfil não funcionava** (o
formulário nunca semeava instituição, cidade e habilidades, e salvar era recusado
com "Escolha sua instituição" num perfil que já tinha uma), e o mapa ficou sem
tiles porque o servidor de desenvolvimento servia o worker compartilhado como
`text/html` — cache dele, não regressão de código.

**287 testes, 118/118 critérios provados, auditoria limpa.**

### ~~Fatia 6.8 — Apresentação viva e ajustes~~ · **entregue**

**A mudança de regra: o perfil novo nasce visível no mapa.** Isso inverteu o
P-011 e o AC-015, que diziam o contrário desde o primeiro dia. A razão deles era
boa — padrão pré-marcado em algo de localização é o que "opt-in consciente"
existe para evitar —, e por isso a inversão ficou registrada na constituição com
o motivo, e não apagada. O que a sustenta continua valendo e não pode ser
afrouxado junto: o mapa conhece apenas o município, o formulário avisa a pessoa
de que ela vai aparecer, sair é imediato, e **quem já tinha perfil não foi
migrado** — ligar o mapa de quem escolheu ficar fora seria desfazer a decisão
dela pelas costas.

**A que dá cara ao produto:** a apresentação ganhou uma nuvem de pixels que
deriva sozinha e se afasta do cursor, em canvas próprio. Uma dependência de
partículas pesaria mais que o recurso numa página que precisa abrir rápido para
quem chegou por um link de convite.

**Os defeitos corrigidos**, todos encontrados usando o produto:

- **O botão de conectar não respondia.** A lista de caches atualizados não
  incluía o feed, então a publicação continuava dizendo `connection: 'none'`.
  Os três estados do laço passaram a ser visíveis, porque "o botão sumiu" não
  diz se o pedido saiu, se falhou ou se as duas pessoas já eram conexão.
- **O layout saltava ao trocar de seção**, por meia largura de barra de rolagem.
- **No celular, os botões do perfil ficavam por cima do nome** — o `flex-wrap`
  distribuía o que sobrava, e o que sobrava era nada.
- **Avatar com foto ausente** mostrava o ícone de imagem quebrada.

"Avisos" saiu do menu, adiado para a v2 — a rota continua viva.

**306 testes, 124/124 critérios provados, auditoria limpa.**

### ~~Fatia 6.9 — Convite simples e apresentação animada~~ · **entregue**

**Duas mudanças de regra, ambas com o custo apresentado antes.**

*Quem convida.* Era privilégio da coordenação, e o botão era invisível para quase
todo mundo — o dono do produto abriu o aplicativo procurando e não achou. Agora
**todo embaixador convida**, com teto de 5 a cada 30 dias. O AC-017 foi invertido
com o motivo registrado, e o que segura o portão deixou de ser a permissão: passou
a ser o teto, para uma conta comprometida não virar torneira.

*O código.* Eram 32 caracteres hexadecimais, impossíveis de ditar. Passaram a ser
**8**, de um alfabeto sem I, L, O e U. Foram 8 e não 5 porque os números pesaram:
com 5 caracteres e cinquenta convites ativos, um atacante acerta um em cerca de
dois meses; com 8, leva milhares de anos. E como o banco guarda só o hash, 5
caracteres seriam quebrados em segundos num vazamento. A diferença para quem
digita é uma sílaba.

**A página do convite** deixou de pedir o que já está no link: ela diz *"Olá,
{quem convidou} te convidou"* e leva ao login, guardando o código no navegador
para ele sobreviver ao vaivém do provedor social.

**A apresentação** ganhou a nuvem de pixels como fundo da página inteira e o
degradê de "embaixadores" em movimento. **O pino do mapa** perdeu o nome da
cidade — ficam os rostos e quantos não couberam; o nome vem no hover e ao clicar.

Dois defeitos de canvas apareceram: `<canvas>` tem tamanho intrínseco de 300×150
e `inset-0` não estica elemento com dimensão própria (a nuvem nascia minúscula no
canto); e `w-full` numa página com calha de barra reservada para quinze pixels
antes da borda.

**323 testes, 132/132 critérios provados, auditoria limpa.**

### ~~Fatia 6.10 — Indicação, convite aberto e prontidão para publicar~~ · **entregue**

Três coisas, e a do meio é uma mudança de regra com custo.

**A indicação.** Quem entra por um convite passa a constar como indicado por quem o gerou.
O vínculo já existia em `InviteCode`, mas não sobrevivia: a linha do convite tem cascade, e
excluir quem convidou apagava junto o registro de que essa pessoa trouxe cinco outras. Um
convite é papel que se consome; a indicação é fato — daí `User.invitedById`, com `SET NULL`
e nunca `CASCADE`.

**O convite deixou de ser de uso único.** Decisão do dono do produto, com o custo
apresentado antes: um embaixador que quisesse trazer as quarenta pessoas do capítulo dele
precisava de quarenta links e só podia criar cinco. O que se perdeu está escrito no P-009 e
não deve ser minimizado — **o uso único era o que continha um link vazado**. O que ficou no
lugar é o prazo, encurtado de 30 para 15 dias, e o teto de criação por período.

Isso torna **revogar convite** a companhia natural da mudança — sem uso único, é o único
jeito de estancar um link vazado antes do prazo. O dono do produto avaliou e **não a tornou
bloqueante**: a divulgação é em grupo fechado do programa, o ConnectGSA não é produto
oficial, e a fronteira que importa (dado pessoal) não foi afrouxada. Fica como Fatia 9.

**A prontidão.** Três defeitos que só existiriam em produção, encontrados ao preparar a
publicação e nenhum deles com sintoma em desenvolvimento:

- **O login abriria deslogado.** O cookie de sessão era `SameSite=Lax` fixo, e Lax só é
  enviado entre origens do mesmo site. `.web.app` e `.run.app` são sufixos públicos
  diferentes: o cookie seria aceito na volta do OAuth e sumiria em toda chamada de dado
  depois, sem uma linha de erro. Virou `COOKIE_SAME_SITE`, com a decisão explicada no
  guia de publicação.
- **As fotos sumiriam.** Sem `MEDIA_BUCKET`, a API grava no disco do Cloud Run, que é
  efêmero — e o `deploy-api.yml` não passava a variável. Agora a API se recusa a subir sem
  ela em produção. Era um aviso no README, e aviso em README não é trava.
- **Não havia CSP no Hosting**, num SPA que renderiza texto de terceiros. Foi escrita e
  **verificada em navegador** com o build de produção e o mapa aberto, antes de entrar.

Junto: publicação em parágrafos (`sanitizeMultiline`), a Google Sans servida do próprio
domínio, a marca como arquivo, o ícone da aba, e o rastro de ferramental de agente fora do
repositório.

**347 testes, 137/137 critérios provados.**

### Fatia 7 — Publicação em produção · **bloqueado por você**

Nada está no ar. A infraestrutura mudou de Google Cloud para **Render (API) + Vercel (SPA)
+ Cloudflare R2 (imagens) + Neon (banco)** — decisão do dono do produto. O `render.yaml` e
o `vercel.json` estão no repositório, e o **passo a passo completo está no README, seção
"Colocar no ar"** — dez passos, com as três armadilhas que falham em silêncio marcadas.

Falta, e não depende de código:

1. Criar as contas (Render, Vercel, Cloudflare, Neon, UptimeRobot) — todas gratuitas
2. Criar o banco no Neon e o bucket no R2
3. Gerar as credenciais OAuth do Google, do LinkedIn e do GitHub
4. Trocar os dois marcadores da CSP no `vercel.json` pelos endereços reais

O que a migração trouxe de novo, e que não existia no desenho anterior:

- **A hibernação do Render** (~15 min sem tráfego, ~50 s para voltar) é o limite que aperta
  primeiro, e desde o primeiro dia. A mitigação é um monitor externo; o workflow do
  repositório é reforço, não solução, e o próprio arquivo diz por quê.
- **`COOKIE_SAME_SITE=none` virou requisito**, porque `vercel.app` e `onrender.com` são
  sites diferentes. Volta a `lax` no dia do domínio próprio.
- **Um segredo novo passou a existir:** o Cloud Storage autenticava pelo ambiente, o R2
  exige chave e segredo.

### Fatia 8 — Testes de ponta a ponta

A suíte cobre bem serviço e rota, mas o fluxo completo no navegador — convite, login social
real, onboarding, publicação — só foi verificado à mão.

### Fatia 9 — Revogar convite

Nasceu da Fatia 6.10 e não estava em nenhum plano. Com o convite atendendo quantas pessoas
receberem o link, revogar virou a única forma de estancar um vazamento antes dos 15 dias.

**Não bloqueia o lançamento**, por decisão do dono do produto: o link é divulgado em grupo
fechado do programa e o ConnectGSA não é produto oficial. O risco aceito tem nome e está
escrito em `.spec/features/convite-aberto/` — quem entra por um link vazado vê o diretório.

Exige uma rota, a listagem dos convites ativos na tela (que hoje não existe — a tela só
mostra o convite recém-gerado) e uma decisão sobre o que acontece com quem já entrou pelo
link revogado.

### Fatia 10 — Gamificação

Pontos, badges e ranking opcional. É o que mais engaja num lançamento, e o mais fácil de
adiar sem consequência.

### Fatia 11 — Tempo real

Presença online e contadores ao vivo. Atenção ao teto do plano gratuito do Firebase: **100
conexões simultâneas**, e as novas são recusadas. O lançamento é justamente o pico.

---

## 4. Riscos que continuam abertos

| Risco | Situação |
|---|---|
| **Firebase Hosting: 360 MB/dia** — ao estourar, o site é desligado | mitigado em parte (mapa sob demanda); falta pôr um CDN gratuito na frente |
| **Firebase RTDB: 100 conexões simultâneas** no plano gratuito | ainda não afeta — o tempo real não existe |
| **Marca**: "ConnectGSA" usa o nome do programa do Google | aviso de projeto não oficial no rodapé; sem aval, o risco permanece |
| ~~**Sem exportar/excluir conta** antes da abertura pública~~ | entregue na Fatia 4 |
| **Convite vazado não tem como ser revogado** — vale 15 dias para quem tiver o link | risco aceito: divulgação em grupo fechado, projeto não oficial. Revogação é a Fatia 9 |

---

## 5. Perguntas que continuam sem resposta

São doze, registradas nas specs. As que mais mudam decisão:

- O programa fornece a lista oficial de e-mails dos embaixadores? (Q-001)
- O alcance é o capítulo brasileiro, os Estados Unidos ou global? (Q-002)
- O nome e a identidade visual têm aval do Google? (Q-003)
- "Bora junto" e "Posso ajudar" devem notificar o autor na hora? (Q-006)
- O perfil público deve ser visível a quem não está logado? (Q-012)
