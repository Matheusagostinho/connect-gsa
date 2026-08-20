import { config as loadEnvFile } from 'dotenv';
import { createPrismaClient } from '@connect-gsa/db';
import { buildApp } from './app.js';
import { parseEnv } from './env.js';

/**
 * O `.env` mora na RAIZ do monorepo, não nesta pasta.
 *
 * `import 'dotenv/config'` procuraria a partir do diretório de trabalho — que é
 * `apps/api` quando o turbo executa o script, e a raiz quando alguém roda na
 * mão. Resolver o caminho relativo a este arquivo faz o comportamento ser o
 * mesmo nos dois casos, em `src/` e em `dist/`.
 *
 * Em produção não há arquivo nenhum: as variáveis vêm do Secret Manager pelo
 * Render, e `quiet` evita o aviso de arquivo ausente.
 */
loadEnvFile({ path: new URL('../../../.env', import.meta.url), quiet: true });

/**
 * Ponto de entrada em produção.
 *
 * `host: '0.0.0.0'` não é detalhe: o Render encaminha tráfego para a
 * interface externa do contêiner, e escutar apenas em localhost faria o
 * serviço subir "saudável" e recusar toda requisição.
 */
const env = parseEnv();
const prisma = createPrismaClient(env.DATABASE_URL);
const app = await buildApp({ env, prisma, version: process.env.APP_VERSION ?? '0.1.0' });

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, 'encerrando');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: env.PORT, host: '0.0.0.0' });
