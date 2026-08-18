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
