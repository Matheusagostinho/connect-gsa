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
   * Armazenamento de imagens.
   *
   * Ausentes, a API usa disco local — adequado a desenvolvimento e testes, e
   * inadequado a produção, onde o Cloud Run tem sistema de arquivos efêmero e
   * um deploy apagaria tudo.
   */
  MEDIA_BUCKET: z.string().min(1).optional(),
  MEDIA_PUBLIC_URL: z.url().optional(),
  MEDIA_LOCAL_DIR: z.string().min(1).default('.media'),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  LINKEDIN_CLIENT_ID: z.string().min(1),
  LINKEDIN_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    // Só os NOMES das variáveis problemáticas — jamais os valores (P-005).
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${fields}`);
  }

  return result.data;
}
