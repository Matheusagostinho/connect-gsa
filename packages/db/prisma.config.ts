import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Configuração do CLI do Prisma (migrate, generate, seed).
 *
 * A partir do Prisma 7 a URL de conexão sai do `schema.prisma` e vem para cá.
 * Ela é usada apenas por comandos de linha; em runtime quem conecta é o driver
 * adapter escolhido em `src/client.ts`.
 *
 * ## Por que a URL não usa o helper `env()` do Prisma
 *
 * `env('DATABASE_URL')` resolve na hora em que o arquivo é CARREGADO, e lança se
 * a variável não existir. Isso quebrava o `prisma generate` dentro da imagem
 * Docker, onde não há (nem deve haver) string de conexão: gerar o client é
 * trabalho de tipos, e não toca no banco.
 *
 * O sintoma era ruim de ler — "Cannot resolve environment variable" no meio de
 * um build que só queria gerar tipos — e travava a construção da imagem inteira.
 *
 * Lendo direto do `process.env`, a ausência só importa para quem de fato precisa
 * dela (`migrate`, `db push`, `seed`), e esses avisam com a mensagem certa.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
