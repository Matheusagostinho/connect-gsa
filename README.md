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
| Login social (Google, LinkedIn, GitHub) | Feed e quadro de avisos |
| Acesso restrito por convite ou lista aprovada | Gamificação (pontos, badges, ranking) |
| Perfil: criar, ver, editar | Presença online em tempo real |
| Controle de visibilidade no mapa | Exportar e excluir a própria conta |
| Permissões por papel (CASL) | Foto de perfil própria (usamos a do provedor) |

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
# Gere o segredo da sessão:
#   openssl rand -base64 32
# e crie as credenciais OAuth nos consoles do Google, LinkedIn e GitHub.

docker compose up -d          # Postgres local na porta 5433
pnpm db:migrate
pnpm db:seed                  # 5.571 municípios do IBGE + 94 instituições

pnpm dev                      # API em :3333 e SPA em :5173
```

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
pnpm test                     # suíte inteira
pnpm turbo run lint typecheck
```

Os testes rodam contra um Postgres de verdade, não contra mocks: reserva de convite sob
corrida e unicidade de e-mail são garantias do banco, e um mock aprovaria implementações
erradas.

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
