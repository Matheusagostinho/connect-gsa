import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { buildApp } from '../app.js';
import type { Env } from '../env.js';
import { testDb } from './db.js';

/**
 * Ambiente de teste da API.
 *
 * Os segredos aqui são de mentira e nunca saem do processo de teste — servem
 * apenas para o `parseEnv` aceitar a configuração. Nenhum deles vale em
 * qualquer ambiente real.
 */
export const testEnv: Env = {
  NODE_ENV: process.env['DEBUG_TEST_LOGS'] ? 'development' : 'test',
  PORT: 0,
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  WEB_ORIGINS: ['http://localhost:5173'],
  WEB_URL: 'http://localhost:5173',
  API_URL: 'http://localhost:3333',
  BETTER_AUTH_SECRET: 'segredo-de-teste-suficientemente-longo-para-hmac',
  COOKIE_SAME_SITE: 'lax',
  // Disco temporário: os testes gravam imagens de verdade, mas fora do projeto.
  MEDIA_LOCAL_DIR: join(tmpdir(), 'connect-gsa-test-media'),
  GOOGLE_CLIENT_ID: 'test',
  GOOGLE_CLIENT_SECRET: 'test',
  LINKEDIN_CLIENT_ID: 'test',
  LINKEDIN_CLIENT_SECRET: 'test',
  GITHUB_CLIENT_ID: 'test',
  GITHUB_CLIENT_SECRET: 'test',
};

/**
 * Sobe a aplicação real — mesmas rotas, mesma validação, mesma autorização,
 * mesmo tratamento de erro — trocando apenas de onde vem a identidade do
 * requisitante: o cabeçalho `x-test-user` em vez do cookie do Better Auth.
 *
 * O cabeçalho só é consultado por este resolvedor, que existe somente aqui.
 * A aplicação de produção nunca o registra.
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  return buildApp({
    env: testEnv,
    prisma: testDb(),
    resolveSession: (request: FastifyRequest) => {
      const header = request.headers['x-test-user'];
      return Promise.resolve(typeof header === 'string' && header.length > 0 ? header : undefined);
    },
  });
}

export const asUser = (userId: string): Record<string, string> => ({ 'x-test-user': userId });
