import { z } from 'zod';

/**
 * Contrato das variáveis de ambiente.
 *
 * A aplicação falha ao subir se algo estiver faltando ou malformado — de
 * propósito. Um segredo ausente que só aparece no primeiro login em produção é
 * pior do que um contêiner que se recusa a iniciar.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),

  DATABASE_URL: z.string().min(1),

  /** Origens autorizadas no CORS. Lista explícita: nunca curinga (P-004). */
  WEB_ORIGINS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  WEB_URL: z.url(),
  API_URL: z.url(),

  BETTER_AUTH_SECRET: z.string().min(32, 'gere com: openssl rand -base64 32'),

  /**
   * `SameSite` do cookie de sessão. **Leia antes de mudar.**
   *
   * `lax` é o certo e é o padrão: ele é o que impede um site qualquer de
   * disparar requisição autenticada em nome de quem está logado (CSRF).
   *
   * Ele só funciona quando o SPA e a API estão no MESMO SITE — mesmo domínio
   * registrável. `app.exemplo.com.br` e `api.exemplo.com.br` são o mesmo site;
   * `connectgsa.web.app` e `connect-gsa-api.us-east1.run.app` **não são**,
   * porque `web.app` e `run.app` são sufixos públicos distintos.
   *
   * Cross-site com `lax`, o navegador manda o cookie na navegação de volta do
   * OAuth (que é de topo) e NÃO manda em nenhuma chamada de dado depois. O
   * efeito é cruel: o login parece dar certo e o aplicativo abre deslogado, sem
   * erro nenhum no console. Não aparece em desenvolvimento porque lá tudo é
   * `localhost` atrás do proxy do Vite — é defeito exclusivo de produção.
   *
   * Se você for publicar em domínios de sites diferentes, isto precisa ser
   * `none` (que exige `secure`, já garantido em produção) — e aí a defesa de
   * CSRF passa a ser só a lista de origens do CORS. A saída melhor é usar um
   * domínio próprio com a API num subdomínio, e deixar isto em `lax`.
   */
  COOKIE_SAME_SITE: z.enum(['lax', 'none']).default('lax'),

  /**
   * Teto global de requisições por minuto.
   *
   * Chaveado por usuário quando há sessão, e por IP quando não há — o segundo
   * caso é o que torna este número configurável: a suíte de testes dispara
   * centenas de requisições sem sessão contra `127.0.0.1` em poucos segundos, e
   * com o teto de produção testes começavam a falhar por 429 de forma
   * INTERMITENTE, mudando de fatia a cada execução. Um teste que falha às vezes
   * é pior que um teste que falha sempre.
   *
   * Em produção, é este o parâmetro a subir se um campus atrás de NAT começar a
   * levar 429 sem motivo.
   */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  /**
   * Chaves do aviso por notificação (VAPID). Opcionais de propósito.
   *
   * Sem elas o recurso simplesmente não existe: a tela não oferece autorizar, e
   * o envio devolve cedo. É o que permite desenvolver e rodar a suíte sem gerar
   * par de chaves — e o que impede um ambiente mal configurado de derrubar o
   * cadastro por causa de uma notificação.
   *
   * `npx web-push generate-vapid-keys` gera DUAS delas — o par de chaves.
   *
   * `VAPID_SUBJECT` não sai de comando nenhum, e não é credencial: é um
   * CONTATO. Os serviços de push dos fabricantes o exigem para saber a quem
   * reclamar se o domínio começar a mandar spam — sem contato válido, podem
   * bloquear os envios sem aviso. Aceita `mailto:voce@dominio.com` ou uma URL.
   */
  VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  VAPID_PRIVATE_KEY: z.string().min(1).optional(),
  VAPID_SUBJECT: z.string().min(1).optional(),

  /**
   * Armazenamento de imagens no Cloudflare R2.
   *
   * Ausentes, a API usa disco local — adequado a desenvolvimento e testes, e
   * inadequado a produção, onde o contêiner tem sistema de arquivos efêmero e
   * um reinício apagaria tudo.
   *
   * `MEDIA_PUBLIC_URL` é o endereço de LEITURA do bucket (o subdomínio `r2.dev`
   * ou o domínio próprio ligado a ele), e não o endpoint de escrita — são dois
   * hosts diferentes no R2, e trocá-los faz toda imagem responder 401.
   */
  MEDIA_BUCKET: z.string().min(1).optional(),
  MEDIA_PUBLIC_URL: z.url().optional(),
  MEDIA_LOCAL_DIR: z.string().min(1).default('.media'),

  /**
   * Credenciais do R2. Gere o par com permissão de **Object Read & Write num
   * único bucket**, nunca de conta inteira (P-007).
   */
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  LINKEDIN_CLIENT_ID: z.string().min(1),
  LINKEDIN_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
});

/**
 * Em produção, o armazenamento de imagem precisa ser o bucket.
 *
 * Sem elas, `createStorage` cai no disco local — e o disco do contêiner é
 * EFÊMERO. O estrago não aparece no deploy: aparece semanas depois, com a foto
 * de perfil de todo mundo virando 404 porque o contêiner reiniciou. E como o
 * plano gratuito do Render hiberna por inatividade, "reiniciou" aqui não é um
 * evento raro: é toda madrugada.
 *
 * Isto era um aviso no README, e aviso em README não é trava. A regra da casa
 * está no topo deste arquivo: um contêiner que se recusa a iniciar é melhor que
 * um que sobe com um buraco.
 */
const envSchemaComRegrasDeProducao = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;

  const obrigatoriasEmProducao = [
    'MEDIA_BUCKET',
    'MEDIA_PUBLIC_URL',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
  ] as const;

  for (const campo of obrigatoriasEmProducao) {
    if (!env[campo]) {
      ctx.addIssue({
        code: 'custom',
        path: [campo],
        message: 'obrigatório em produção: sem bucket, as imagens somem a cada reinício',
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchemaComRegrasDeProducao.safeParse(source);

  if (!result.success) {
    // Só os NOMES das variáveis problemáticas — jamais os valores (P-005).
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${fields}`);
  }

  return result.data;
}
