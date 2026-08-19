# Spec: Dados do titular

> feature: dados-do-titular
> status: rascunho

## Contexto

A LGPD dá ao titular dois direitos que hoje o ConnectGSA não atende: **portabilidade**
(art. 18, V) e **eliminação** (art. 18, VI). A constituição do projeto marca o P-012
como obrigatório **antes da abertura pública do cadastro** — e a rede guarda dado de
estudante, inclusive foto.

Não é só apagar linhas. Duas coisas costumam ser esquecidas e viram defeito:

1. **As imagens.** Foto de perfil e imagem de post vivem no armazenamento, não no
   banco. Apagar só as linhas deixaria os arquivos acessíveis por URL, para sempre.
2. **Os contadores.** `reactionCount` e `commentCount` são desnormalizados. Ao apagar
   alguém, as reações e os comentários dessa pessoa somem em cascata — e os
   contadores nos posts **de terceiros** ficariam mentindo, para sempre, sem que
   ninguém percebesse.

## Histórias

### US-026 — Levar meus dados comigo

Como embaixador, quero baixar tudo o que a rede sabe sobre mim, para ter meus dados
fora dela sem depender de pedir a ninguém.

#### AC-069 — Baixo meus dados em formato legível por máquina

- **Dado** que estou autenticado
- **Quando** peço a exportação dos meus dados
- **Então** recebo um arquivo estruturado, que outro programa consegue ler, com a data
  em que foi gerado

#### AC-070 — A exportação traz tudo o que é meu

- **Dado** que tenho perfil preenchido, publicações, comentários, reações e conexões
- **Quando** examino o arquivo exportado
- **Então** encontro todos eles — inclusive o meu e-mail, que é meu dado

#### AC-071 — A exportação não entrega dados de terceiros

- **Dado** que outras pessoas comentaram nas minhas publicações
- **Quando** examino o arquivo exportado
- **Então** não há e-mail de ninguém além do meu

### US-027 — Sair da rede e não deixar rastro

Como embaixador, quero excluir minha conta e tudo o que produzi, para exercer o direito
de eliminação sem precisar pedir a alguém.

#### AC-072 — Excluo minha conta e ela deixa de existir

- **Dado** que estou autenticado e confirmei a exclusão
- **Quando** a exclusão termina
- **Então** não resta registro meu de usuário, e meu endereço de perfil deixa de responder

#### AC-073 — Minhas publicações, comentários e reações somem junto

- **Dado** que publiquei, comentei e reagi
- **Quando** excluo minha conta
- **Então** nada disso continua na rede

#### AC-074 — As imagens que enviei somem do armazenamento

- **Dado** que enviei foto de perfil e imagem em publicações
- **Quando** excluo minha conta
- **Então** os arquivos deixam de existir no armazenamento — não só as linhas do banco

#### AC-075 — Os contadores das publicações de terceiros continuam corretos

- **Dado** que reagi e comentei na publicação de outra pessoa
- **Quando** excluo minha conta
- **Então** os contadores daquela publicação passam a refletir o que sobrou, sem contar
  o que era meu

#### AC-076 — Excluir exige confirmação explícita

- **Dado** que peço a exclusão sem confirmar
- **Quando** a rede analisa o pedido
- **Então** ela recusa e nada é apagado — exclusão é irreversível e não pode acontecer
  por um toque errado

#### AC-077 — Depois de excluir, a sessão deixa de valer

- **Dado** que acabei de excluir minha conta
- **Quando** faço uma nova requisição a uma área restrita
- **Então** recebo a recusa de quem não está autenticado

## Fora de escopo

- Exclusão pedida por outra pessoa (coordenação removendo alguém do programa).
- Período de arrependimento antes de apagar de fato.
- Exportar em outros formatos além de um só, estruturado.
- Trilha de auditoria das operações de tratamento (LGPD art. 37) — merece fatia própria.
- Anonimizar em vez de apagar.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-023 | Exclusão é imediata e definitiva, sem período de arrependimento. Guardar dado de quem pediu para apagar contraria o próprio direito exercido | aberta | — |
| ASM-024 | A exportação sai numa requisição só. Com os volumes de um embaixador — dezenas de posts, não milhares — não compensa a complexidade de gerar em segundo plano | aberta | — |
| ASM-025 | Apagar a conta apaga as publicações. A alternativa seria manter o conteúdo órfão, o que preserva as conversas mas contraria o direito de eliminação | aberta | — |
| ASM-026 | Confirmar digitando uma palavra basta como barreira; não é preciso reautenticar | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-016 | Um convite gerado por alguém que depois sai da rede deve continuar valendo? Hoje ele é apagado junto | aberta | — |
| Q-017 | O programa precisa ser avisado quando um embaixador exclui a conta? | aberta | — |
| Q-018 | A trilha de auditoria da LGPD (art. 37) entra antes ou depois da abertura pública? | aberta | — |
