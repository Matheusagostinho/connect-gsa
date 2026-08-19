# Roadmap do ConnectGSA

> Situação em 19 de agosto de 2026 · 206 testes · 89/89 critérios de aceite provados

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

### Fatia 7 — Publicação em produção · **bloqueado por você**

> Os três workflows estão **desligados no automático** desde 19/08/2026, a pedido: rodam só
> sob demanda pela aba Actions. Os de deploy não teriam como passar sem os segredos do
> Google Cloud. O de CI tinha um defeito próprio — rodava o seed sem gerar o client do
> Prisma antes —, já corrigido. Religar é devolver os gatilhos, que estão comentados no
> topo de cada arquivo.

Nada disso está no ar. Falta, e não depende de código:

1. Criar o projeto no Google Cloud e ativar o faturamento
2. Gerar as credenciais OAuth do Google, do LinkedIn e do GitHub
3. Criar o banco no Neon e o bucket no Cloud Storage
4. Configurar o Workload Identity Federation para o CI publicar sem chave

O pipeline está pronto e testado até onde dá sem essas contas.

### Fatia 8 — Testes de ponta a ponta

A suíte cobre bem serviço e rota, mas o fluxo completo no navegador — convite, login social
real, onboarding, publicação — só foi verificado à mão.

### Fatia 9 — Gamificação

Pontos, badges e ranking opcional. É o que mais engaja num lançamento, e o mais fácil de
adiar sem consequência.

### Fatia 10 — Tempo real

Presença online e contadores ao vivo. Atenção ao teto do plano gratuito do Firebase: **100
conexões simultâneas**, e as novas são recusadas. O lançamento é justamente o pico.

---

## 4. Riscos que continuam abertos

| Risco | Situação |
|---|---|
| **Firebase Hosting: 360 MB/dia** — ao estourar, o site é desligado | mitigado em parte (mapa sob demanda); falta pôr um CDN gratuito na frente |
| **Firebase RTDB: 100 conexões simultâneas** no plano gratuito | ainda não afeta — o tempo real não existe |
| **Marca**: "ConnectGSA" usa o nome do programa do Google | aviso de projeto não oficial no rodapé; sem aval, o risco permanece |
| **Sem exportar/excluir conta** antes da abertura pública | é a Fatia 4, a próxima |

---

## 5. Perguntas que continuam sem resposta

São doze, registradas nas specs. As que mais mudam decisão:

- O programa fornece a lista oficial de e-mails dos embaixadores? (Q-001)
- O alcance é o capítulo brasileiro, os Estados Unidos ou global? (Q-002)
- O nome e a identidade visual têm aval do Google? (Q-003)
- "Bora junto" e "Posso ajudar" devem notificar o autor na hora? (Q-006)
- O perfil público deve ser visível a quem não está logado? (Q-012)
