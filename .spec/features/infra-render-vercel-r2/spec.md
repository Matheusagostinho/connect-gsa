# Spec: Publicar fora do Google Cloud

> feature: infra-render-vercel-r2
> status: implementada

## Contexto

A infraestrutura era Google Cloud inteiro: Cloud Run para a API, Firebase Hosting
para o SPA, Cloud Storage para as imagens, Artifact Registry para a imagem e
Workload Identity Federation para o CI publicar sem chave.

**Passou a ser Render (API) + Vercel (SPA) + Cloudflare R2 (imagens) + Neon
(banco)**, por decisão do dono do produto. Nada disso estava no ar ainda, então
não houve migração de dado — só de destino.

O que a troca custou e ganhou, sem propaganda:

**Ganhou.** Render e Vercel publicam direto do Git, então sumiram o Workload
Identity Federation, o Artifact Registry, o push de imagem e dois workflows
inteiros. O R2 não cobra saída de dados, que é o custo que mata bucket de imagem.

**Custou três coisas, e as três são reais:**

1. **A API hiberna.** O plano gratuito do Render dorme em ~15 min sem tráfego e
   leva ~50 s para voltar. Numa rede onde a pessoa chega por link de convite,
   é o pior momento possível. A mitigação é um ping externo — e o workflow do
   repositório sozinho não resolve, porque o cron do GitHub atrasa sob carga.
2. **`COOKIE_SAME_SITE=none` virou requisito.** `vercel.app` e `onrender.com` são
   sufixos públicos diferentes: com `lax`, o navegador aceita o cookie na volta
   do OAuth e não o manda em mais nenhuma chamada. O aplicativo abriria
   deslogado, sem erro no console. A defesa de CSRF passa a ser só a lista de
   origens do CORS, até haver domínio próprio.
3. **Passou a existir um segredo que não existia.** O Cloud Storage autenticava
   pelas credenciais do ambiente; o R2 exige chave e segredo.

**A interface `StorageDriver` pagou o que prometia:** a troca de provedor foi um
arquivo novo e uma linha no `app.ts`. Nenhuma rota, nenhum serviço e nenhuma
linha do banco souberam — porque o banco guarda a CHAVE do objeto, nunca a URL.

## Histórias

### US-064 — Publicar sem depender de um provedor só

Como dono do produto, quero publicar em serviços gratuitos independentes, para
não depender de uma conta de faturamento única nem de um provedor só.

#### AC-151 — A API se recusa a subir em produção sem armazenamento

- **Dado** um ambiente de produção sem alguma das variáveis do bucket
- **Quando** a API tenta subir
- **Então** ela falha na subida, dizendo qual variável falta — porque o disco do
  contêiner é efêmero e as imagens sumiriam no primeiro reinício, semanas depois
  e sem nada no log

#### AC-152 — Fora de produção, nada de credencial de nuvem é exigido

- **Dado** um ambiente de desenvolvimento ou de teste
- **Quando** a API sobe
- **Então** ela usa o disco local e não pede credencial nenhuma — é o que permite
  rodar a suíte e desenvolver sem conta em provedor

#### AC-153 — Apagar imagem que já não existe não interrompe a exclusão de conta

- **Dado** que uma tentativa anterior de excluir a conta já apagou parte das
  imagens
- **Quando** a exclusão roda de novo
- **Então** ela conclui — senão o titular ficaria com dados que pediu para
  remover (P-012)

#### AC-154 — Erro do armazenamento não vaza o corpo da resposta

- **Dado** que o bucket recusa uma operação
- **Quando** o erro é registrado
- **Então** ele traz o status e nunca o corpo — que ecoa cabeçalhos da requisição
  assinada, e essa mensagem vai para o log (P-005)

## Fora de escopo

- Domínio próprio. Enquanto não houver, `COOKIE_SAME_SITE` fica em `none` e a
  perda está registrada acima.
- Migração automática de banco no deploy. O `preDeployCommand` do Render só
  existe em planos pagos, então a migração é um passo manual — e rodá-la no
  entrypoint foi descartado, porque no gratuito o contêiner reinicia a cada saída
  da hibernação.
- Plano pago do Render, que resolveria a hibernação por US$ 7/mês.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| ASM-059 | O R2 é falado pelo protocolo S3, com `aws4fetch` em vez do SDK da AWS: um pacote em vez de vinte e cinco, para as duas chamadas que fazemos | confirmada | `R2StorageDriver`. O binding nativo do R2 seria melhor e só existe dentro de Cloudflare Workers |
| ASM-060 | O ping externo (UptimeRobot) é o principal contra a hibernação, e o workflow do repositório é reforço | confirmada | O cron do GitHub é entregue por melhor esforço e atrasa sob carga, enquanto a hibernação chega aos 15 min |
| ASM-061 | A migração de banco continua sendo passo manual enquanto o plano for gratuito | confirmada | `render.yaml` guarda o comando comentado, pronto para religar |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| Q-037 | Quando comprar domínio próprio, o `COOKIE_SAME_SITE` volta para `lax` na mesma hora? | respondida | Sim, e é uma variável só. Está escrito no guia de publicação e no `render.yaml` |
