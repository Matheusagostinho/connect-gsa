import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Configuração do CLI do Prisma (migrate, generate, seed).
 *
 * A partir do Prisma 7 a URL de conexão sai do `schema.prisma` e vem para cá.
 * Ela é usada apenas por comandos de linha; em runtime quem conecta é o driver
 * adapter escolhido em `src/client.ts`.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
