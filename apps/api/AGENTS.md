# apps/api — a API do ConnectGSA

Fastify 5 + Better Auth + Prisma + CASL. **Toda decisão de segurança do produto mora
aqui.** O SPA esconde botões; esta pasta é quem recusa requisições.

## Estrutura

```
src/
├── app.ts              monta a aplicação (sem abrir porta — é o que permite testar)
├── server.ts           ponto de entrada de produção
├── env.ts              contrato das variáveis de ambiente (falha ao subir se faltar)
├── types.ts            AppInstance — Fastify já ciente do provedor de tipos do Zod
├── plugins/
│   ├── security.ts     helmet, CORS por lista, rate limit, cookie
│   └── errors.ts       AppError + tratamento central (não vaza stack em produção)
├── auth/
│   ├── better-auth.ts  provedores sociais, vínculo de contas e O PORTÃO da rede
│   ├── signed-ticket.ts assinatura HMAC genérica com prazo
│   ├── invite-ticket.ts bilhete que atravessa o vaivém do OAuth
│   ├── dev-login.ts    porta dos fundos de desenvolvimento, travada contra produção
│   └── session.ts      resolve a sessão e expõe `request.currentUser`
├── authz/              CASL: quem pode o quê
├── modules/
│   ├── invite/         geração, conferência e reserva atômica de convites
│   ├── profile/        perfil, sanitização e o mapper que nunca devolve e-mail
│   └── share/          prévia Open Graph para link colado no WhatsApp
└── routes/             health, repasse do Better Auth, dados de referência
```

## Onde cada rota mora

| Prefixo | O que é |
|---|---|
| `/health` | sonda de infraestrutura — o Cloud Run consulta esta URL |
| `/s/...` | link de compartilhamento, que vai colado em conversa |
| `/api/auth/*` | Better Auth (o `basePath` dele já inclui o prefixo) |
| `/api/*` | todo o resto do aplicativo |

O prefixo único em `/api` é o que permite ao SPA usar caminho relativo em desenvolvimento
(com o proxy do Vite) e URL absoluta em produção, sem cada rota precisar saber qual é o
caso. Ao adicionar rota do aplicativo, registre-a **dentro** do escopo com prefixo.

## O login de desenvolvimento

`auth/dev-login.ts` é uma porta dos fundos deliberada: quem alcança a rota entra como
qualquer usuário. Ela é travada em três camadas, e nenhuma depende de alguém lembrar:

1. `assertDevOnly` **lança** se `NODE_ENV=production`, e roda no momento do registro — a
   API se recusa a subir, em vez de abrir uma brecha silenciosa.
2. O `app.ts` só registra essas rotas fora de produção.
3. `dev-login.test.ts` prova as duas coisas, inclusive que `/api/dev/*` responde 404 numa
   aplicação montada em modo produção.

A trava é o `NODE_ENV` de propósito. Uma variável própria (`ENABLE_DEV_LOGIN`) seria pior:
mais uma coisa para alguém copiar sem querer para o ambiente errado.

## Cinco coisas que não podem ser desfeitas

1. **`profile.mapper.ts` é a única saída de perfil.** Ele valida contra
   `publicProfileSchema`, que não tem campo de e-mail — então devolver e-mail passa a ser
   impossível, não apenas proibido (P-002). Não crie um segundo caminho de serialização.
2. **Toda rota declara `response` schema.** O Fastify serializa através dele; campo fora do
   schema não chega ao cliente. Remover o schema reabre o vazamento.
3. **A reserva de convite é um compare-and-set no Postgres** (`updateMany` com
   `usedAt: null` no filtro). Trocar por "checar depois gravar" reabre a janela de corrida
   que o teste do AC-007 explora com 12 tentativas simultâneas.
4. **Recusa de convite tem mensagem única**, igual para inexistente, expirado e já usado.
   Diferenciar entrega um oráculo para quem varre códigos.
5. **O papel vem do banco a cada requisição**, nunca do cookie. Papel dentro do token seria
   escalonamento de privilégio a uma edição de distância.

## Como escrever um teste de rota

`buildTestApp()` sobe a aplicação real — mesmas rotas, mesma validação, mesma autorização —
trocando só a origem da identidade: o cabeçalho `x-test-user` em vez do cookie. Esse
resolvedor existe apenas em `src/testing/`; produção nunca o registra.

```ts
const response = await app.inject({ method: 'GET', url: '/me', headers: asUser(ana.id) });
```

Para o portão de entrada, `auth.gate.test.ts` usa o plugin `testUtils` do Better Auth, que
grava pelo `internalAdapter` — o mesmo caminho do retorno do OAuth. É por isso que aqueles
testes provam o portão, e não um mock dele.

Os testes precisam do Postgres de verdade (`docker compose up -d`): corrida de convite e
unicidade de e-mail são garantias do banco, e um mock aprovaria implementações erradas.

Eles usam um banco **separado** (`TEST_DATABASE_URL`), porque `resetTestData` apaga tabelas
inteiras. `testing/db.ts` se recusa a rodar se ele for igual ao de desenvolvimento — o
estrago seria silencioso: os testes passariam e você só descobriria ao voltar para a tela.

## Armadilhas conhecidas

- `fileParallelism: false` no `vitest.config.ts`: os testes compartilham um Postgres, e
  arquivos em paralelo limpariam tabelas uns dos outros.
- `trustProxy: true` é obrigatório no Cloud Run — sem ele o rate limit veria o IP do
  balanceador e trataria a internet inteira como um cliente só.
- `parseEnv` lista apenas os **nomes** das variáveis inválidas, nunca os valores (P-005).
