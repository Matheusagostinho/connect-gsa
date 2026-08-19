# Roadmap do ConnectGSA

> Situação em 19 de agosto de 2026 · 173 testes · 68/68 critérios de aceite provados

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
Federais), catálogo fechado de 78 habilidades, e perfil público em `/e/{slug}`.

### Feed e quadro de avisos — **metade**

| Item | Estado |
|---|---|
| Feed com ranking por engajamento, recência e diversidade de autor | pronto |
| Publicar texto e imagem | pronto |
| Reações próprias (Decolou, Aprendi, Respeito, Bora junto, Posso ajudar) | pronto |
| Comentários | pronto |
| **Quadro de avisos oficiais** | **falta** |

O campo `kind` do post já distingue `feed` de `announcement` no banco — mas não existe rota
nem tela. É a fatia mais curta das que faltam.

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
e uma entrada de desenvolvimento travada contra produção.

A navegação também mudou de forma: coluna lateral fixa no computador e barra inferior no
celular, com o mapa ocupando a tela inteira.

---

## 3. O que falta, em ordem

### Fatia 4 — Exportar e excluir a conta · **exigência legal**

LGPD, art. 18, incisos V e VI. A constituição do projeto (P-012) marca isso como obrigatório
**antes da abertura pública do cadastro**. Guardamos dado de estudante, inclusive imagem:
sem isso, o lançamento para o programa fica exposto.

Inclui apagar as imagens do armazenamento, não só as linhas do banco.

### ~~Fatia 5 — Notificações~~ · **entregue**

Pedidos de conexão, reações e comentários nas próprias publicações, com contador de não
lidas na navegação. Derivadas do que já está no banco — sem tabela própria, só uma marca de
"visto até aqui" no usuário. Nesta escala, manter registros duplicados custa mais do que
consultá-los e abre a chance de os dois lados divergirem.

### Fatia 6 — Quadro de avisos

Comunicados oficiais que só a coordenação publica. Curto, porque o schema já suporta — e dá
ao programa um motivo institucional para usar a rede.

### Fatia 7 — Publicação em produção · **bloqueado por você**

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
