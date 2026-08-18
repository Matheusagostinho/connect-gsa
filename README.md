# ConnectGSA

Comunidade **fechada** para os participantes do Programa de Embaixadores Estudantis do
Google. O objetivo é conectar embaixadores entre si — perfil, busca, mapa, feed e
gamificação — começando restrito ao programa.

> **Projeto não oficial.** O ConnectGSA não é afiliado ao Google nem endossado por ele.
> O nome e as referências ao programa são descritivos e serão revistos caso a coordenação
> se manifeste.

## Situação atual

Primeira fatia vertical em produção: **acesso e perfil**.

| Entregue | Ainda não |
|---|---|
| Monorepo, CI/CD e publicação | Busca no diretório e mapa |
| Login social (Google, LinkedIn, GitHub) | Quadro de avisos oficiais |
| Acesso restrito por convite ou lista aprovada | Gamificação (pontos, badges, ranking) |
| Perfil: criar, ver, editar, sair da conta | Presença online em tempo real |
| Feed com ranking, posts, comentários | Notificação de reação e comentário |
| Cinco reações próprias | Sugerir conexão a partir de "Bora junto" |
| Envio de imagem em post e foto de perfil | Vídeo |
| Controle de visibilidade no mapa | Exportar e excluir a própria conta |

A especificação completa, com critérios de aceite e provas, está em
`.spec/features/acesso-e-perfil/`.

## Arquitetura

```
Pessoa ──> Firebase Hosting (SPA estático, CDN global)
             │
             └─ XHR ──> Cloud Run us-east1 (Fastify) ──> Neon Postgres (us-east-1)
                                                          ^ co-locados
```

| Camada | Escolha | Por quê |
|---|---|---|
| SPA | Vite + React 19 | Tudo fica atrás de login: SSR não teria o que renderizar |
| Visual | Google Sans, claro/escuro | Linguagem do antigravity.google; a fonte é SIL OFL desde jan/2026 |
| API | Fastify 5 | Separada do front, com validação e autorização próprias |
| Banco | Postgres (Neon) via Prisma 7 | Fonte de verdade; PostGIS disponível quando precisar |
| Auth | Better Auth | O Auth.js foi absorvido por ele e não recebe mais features |
| Autorização | CASL | Mesmas regras no servidor (valem) e na tela (só escondem) |
| Mídia | Cloud Storage | 5 GB no gratuito |

**Regiões:** o gratuito do Cloud Run vale apenas em `us-central1`, `us-east1` e `us-west1` —
São Paulo **não** entra. Ficamos em `us-east1`, a região gratuita mais próxima do Brasil, com
o Neon em `us-east-1` para que API e banco fiquem lado a lado. O SPA é estático em CDN
global, então só as chamadas de API pagam o salto (~130 ms). Migrar para
`southamerica-east1` depois é trocar uma variável no deploy.

**Custo previsto: US$ 0/mês** no volume do MVP.

## Como rodar

Pré-requisitos: Node 24+, pnpm 10+, Docker.

```bash
git clone https://github.com/Matheusagostinho/connect-gsa.git
cd connect-gsa
pnpm install

cp .env.example .env
# Gere o segredo da sessão e cole em BETTER_AUTH_SECRET:
#   openssl rand -base64 32

docker compose up -d          # Postgres local na porta 5433
pnpm db:migrate               # aplica as migrações
pnpm db:seed                  # 5.571 municípios do IBGE + 94 instituições
pnpm db:seed:dev              # pessoas fictícias para você navegar
pnpm db:test:setup            # banco separado para a suíte de testes

pnpm dev                      # API em :3333 e SPA em :5173
```

Abra **http://localhost:5173/dev** e escolha uma pessoa para entrar.

### Entrar sem credenciais OAuth

A tela `/dev` existe para você testar o aplicativo antes de haver credenciais
OAuth. Ela lista as pessoas semeadas e entra como qualquer uma delas — inclusive
o Diego, que tem perfil incompleto e serve para ver o onboarding sendo exigido.

Isso é uma porta dos fundos deliberada, e por isso é travada em três camadas: a
API **se recusa a subir** se essas rotas forem registradas com
`NODE_ENV=production`, o `app.ts` só as registra fora de produção, e há teste
provando as duas coisas. A tela some do build de produção.

### Ligar o OAuth de verdade

1. **Google** — [Console](https://console.cloud.google.com/apis/credentials) →
   *Criar credenciais* → *ID do cliente OAuth* → *Aplicativo da Web*.
2. **GitHub** — Settings → Developer settings → OAuth Apps → *New OAuth App*.
3. **LinkedIn** — [Developers](https://www.linkedin.com/developers/apps) → *Create app*
   → aba *Auth*.

Em todos, cadastre a URL de retorno
`http://localhost:3333/api/auth/callback/{google|github|linkedin}` (e a equivalente
com o domínio de produção). Cole os pares de id/segredo no `.env` e reinicie a API.

### URLs de retorno do OAuth

Cadastre em cada provedor: `http://localhost:3333/api/auth/callback/{google|linkedin|github}`
(e o equivalente com o domínio de produção).

### Primeiro acesso

Como a rede é fechada, o primeiro usuário precisa entrar por um dos dois caminhos:

```sql
-- Caminho A: liberar seu e-mail na lista aprovada
INSERT INTO "AllowedEmail" (id, email) VALUES (gen_random_uuid(), 'voce@uni.br');

-- Depois do primeiro login, promova-se para poder gerar convites:
UPDATE "User" SET role = 'admin' WHERE email = 'voce@uni.br';
```

Com um administrador no ar, `POST /invites` gera convites para os demais.

## Testes

```bash
docker compose up -d
pnpm db:test:setup            # só na primeira vez
pnpm test                     # suíte inteira
pnpm turbo run lint typecheck
```

Os testes rodam contra um Postgres de verdade, não contra mocks: reserva de convite sob
corrida e unicidade de e-mail são garantias do banco, e um mock aprovaria implementações
erradas.

Eles usam um **banco separado** (`connectgsa_test`), porque limpam tabelas inteiras entre
casos — apontá-los para o banco de desenvolvimento apagaria os dados que você semeou. O
código se recusa a rodar se `TEST_DATABASE_URL` for igual a `DATABASE_URL`.

## As reações

O conjunto é próprio, e a escolha não é estética. Numa rede de **conexão**, "gostei"
desperdiça a interação: as três primeiras reconhecem o post, e as duas últimas sinalizam
disposição de trabalhar junto.

| Reação | Diz | Peso no feed |
|---|---|---|
| 🚀 **Decolou** | Isso aqui é notável | 1 |
| 💡 **Aprendi** | Aprendi alguma coisa com isso | 1,5 |
| 👏 **Respeito** | Reconheço o esforço por trás disso | 1 |
| 🤝 **Bora junto** | Quero construir isso com você | 3 |
| 🙋 **Posso ajudar** | Tenho como ajudar nisso | 3 |

Uma reação por pessoa por post, trocável: escolher outra substitui a anterior, escolher a
mesma desfaz. Isso força a pessoa a dizer o que realmente quis dizer e mantém cada sinal
limpo para o ranking.

## Como o feed ordena

O raciocínio veio do código aberto do X (`xai-org/x-algorithm`), mas **os pesos de lá não
foram copiados** — e isso é deliberado. O comentário no `param.rs` deles avisa que aqueles
números multiplicam *probabilidades previstas por um modelo treinado*, não contagens. Um
report vale −234 porque a probabilidade base dele é mais de mil vezes menor que a de um
like. Aplicar aquela tabela sobre contagens brutas, que é o que temos, produziria
ordenação sem sentido.

O que atravessou foram quatro ideias independentes de modelo:

1. **Ação de esforço vale mais que ação de toque** — comentar pesa 4, reagir pesa 1 a 3.
2. **Diversidade de autor** — cada post seguinte do mesmo autor vale metade, até um piso de
   25%. Numa rede de centenas, uma pessoa prolífica tomaria a tela inteira.
3. **Início frio suavizado** — a nota nunca chega a zero, então post recém publicado
   disputa por recência em vez de ser enterrado por ainda não ter sido visto.
4. **Proximidade em vez de punição** — no X, quem você não segue leva desconto, porque lá
   são centenas de milhões de contas. Aqui a rede cabe numa sala: quem é da sua instituição
   ou cidade sobe, e ninguém desce.

A função está em `apps/api/src/modules/feed/ranking.ts`. É pura, sem banco e sem relógio
implícito — cada regra tem um teste próprio.

## Segurança e privacidade

Os princípios verificáveis estão em `.spec/constituicao.md` — os marcados `[DEVE]` têm
verificação executável. Os que mais moldam o código:

- **Localização nunca é precisa.** O sistema guarda a cidade e usa o centroide do município.
  Não existe coluna de latitude ou longitude em `User`, e o navegador tem `geolocation`
  bloqueada por `Permissions-Policy`. Arredondar só na saída seria frágil demais.
- **E-mail nunca sai da API.** Os schemas de resposta não têm o campo, então devolvê-lo é
  impossível — não apenas proibido.
- **Autenticar não é entrar.** Login social prova identidade; entrar exige convite válido ou
  e-mail na lista do programa.
- **Convite é imprevisível e de uso único.** 128 bits de entropia criptográfica, guardado
  como hash, reservado por operação atômica no Postgres, com limite agressivo de tentativas.
- **Sessão em cookie httpOnly.** Sem senha própria: nada de hash para vazar nem fluxo de
  recuperação para atacar.
- **Autorização no servidor.** A tela esconde botões; quem recusa é a API.
- **Texto livre é sanitizado na entrada**, antes de chegar ao banco.
- **Toda imagem é reprocessada.** Foto de celular carrega coordenadas de GPS no EXIF;
  guardá-la como veio entregaria a localização exata de um estudante. Não removemos "os
  campos ruins" — decodificamos os pixels e escrevemos um arquivo novo, que nasce sem
  metadado nenhum. O tipo é decidido pelos bytes, nunca pela extensão.

Encontrou uma falha? Abra uma issue **sem** detalhes exploráveis e peça contato privado.

## Publicação

Push na `main` dispara os workflows. O CI autentica no Google Cloud por Workload Identity
Federation — não existe chave de conta de serviço guardada como segredo.

Segredos vivem no Secret Manager; o repositório só tem `.env.example` com espaços em branco.

## Limites conhecidos do plano gratuito

| Serviço | Limite | O que acontece ao estourar |
|---|---|---|
| Firebase Hosting | 360 MB/dia | O site é **desligado** até o mês virar |
| Firebase RTDB | 100 conexões simultâneas | Conexões novas são recusadas |
| Neon | 0,5 GB e 191 h de compute | Banco suspende |
| Cloud Run | 2 M req/mês, 180 mil vCPU-s | Passa a cobrar |

O primeiro a apertar deve ser a transferência do Hosting. A saída planejada é um CDN
gratuito na frente do domínio, antes de considerar plano pago.

## Licença

Ainda não definida.
