# Spec: Aplicativo instalável e aviso por notificação

> feature: pwa-e-push
> status: implementada

## Contexto

**O problema que isto resolve.** As notificações existem desde a Fatia 5, mas só
aparecem para quem já está com o aplicativo aberto — e ninguém deixa uma rede
fechada aberta o dia inteiro. Quem recebeu um pedido de conexão descobre na
próxima vez que entrar, que pode ser semana que vem. A conexão que motivou o
pedido já esfriou.

**Duas coisas, e elas dependem uma da outra.** O aviso por notificação (Web Push)
exige um *service worker*, e um *service worker* sem manifesto é meio caminho
para lugar nenhum. Então a fatia entrega as duas: o aplicativo instalável e o
aviso que chega com ele fechado.

## O que NÃO muda

A notificação continua **derivada** do que já está no banco — pedidos, reações e
comentários (ASM-019). O push não cria uma tabela de notificações: ele é um
**canal de entrega** para o que já é calculado. O que ganha tabela é a
INSCRIÇÃO do aparelho, que é outra coisa.

## Histórias

### US-065 — Instalar a rede como aplicativo

Como embaixador, quero instalar o ConnectGSA na tela inicial, para abri-lo como
qualquer outro aplicativo.

#### AC-155 — O manifesto descreve um aplicativo instalável

- **Dado** que abro a rede no celular
- **Quando** o navegador lê o manifesto
- **Então** ele encontra nome, ícones em 192 e 512, ícone adaptável, cor de tema
  e modo de exibição autônomo — o conjunto mínimo que torna a instalação possível

#### AC-156 — Abrir sem rede não mostra a tela de dinossauro

- **Dado** que já abri a rede pelo menos uma vez
- **Quando** abro sem conexão
- **Então** vejo a moldura do aplicativo e um aviso de que estou sem rede, e não
  a página de erro do navegador

### US-066 — Ser avisado quando alguém me procura

Como embaixador, quero receber aviso de pedido de conexão, reação e comentário
mesmo com o aplicativo fechado, para responder enquanto o assunto é assunto.

#### AC-157 — A inscrição do aparelho é guardada por pessoa

- **Dado** que autorizo as notificações
- **Quando** a inscrição é gravada
- **Então** ela fica ligada à minha conta, e o mesmo aparelho inscrito duas vezes
  não vira duas linhas

#### AC-158 — Sair da conta remove a inscrição daquele aparelho

- **Dado** que saio da conta num computador compartilhado
- **Quando** a sessão termina
- **Então** aquele aparelho para de receber os meus avisos — senão a próxima
  pessoa a usar a máquina recebe notificação sobre a minha rede

#### AC-159 — Inscrição morta é removida sozinha

- **Dado** que alguém desinstalou o aplicativo ou revogou a permissão
- **Quando** o envio falha com 404 ou 410
- **Então** a inscrição é apagada — sem isso a tabela vira um cemitério que é
  percorrido a cada aviso

#### AC-160 — O aviso não carrega dado pessoal

- **Dado** que recebo um aviso de reação
- **Quando** ele chega ao aparelho
- **Então** ele traz o primeiro nome de quem reagiu e para onde ir — nunca
  e-mail, e nunca o conteúdo integral da publicação (P-002)

## Fora de escopo

- **Aviso de mensagem direta**, que não existe.
- **Escolher quais tipos de aviso receber.** Hoje é tudo ou nada; separar por
  tipo merece tela própria e decisão sobre o padrão.
- **Aviso por e-mail.** Outro canal, outro fornecedor, outro conjunto de
  problemas de entrega.
- **Sincronizar em segundo plano** (Background Sync). O aplicativo funciona sem
  rede para LER o que já viu; publicar offline exige fila e resolução de
  conflito.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-062 | A inscrição mora em tabela própria (`PushSubscription`), e a notificação continua derivada. São coisas com vidas diferentes: a notificação é calculada, o aparelho é um registro | confirmada | Tabela nova, sem tocar em `notificationsSeenAt` |
| ASM-063 | O envio é disparado no MESMO caminho que já cria o evento (reação, comentário, pedido), e falhar não desfaz a ação | confirmada | Erro de push é registrado e engolido |
| ASM-064 | O `endpoint` da inscrição é a chave única. É ele que o navegador garante ser único por aparelho e por origem | confirmada | `@unique` no schema |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-038 | O aviso deve respeitar horário? Alguém reagindo às 3h acorda o aparelho de quem dorme | respondida | Não nesta fatia. O volume atual não justifica, e uma janela de silêncio mal calibrada é pior que nenhuma — ela atrasa o que era urgente. Volta quando houver volume que incomode |
