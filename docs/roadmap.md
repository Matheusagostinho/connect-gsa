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
