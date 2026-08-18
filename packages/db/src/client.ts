import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.js';

/**
 * Cria o client do Prisma escolhendo o driver adapter certo para o destino.
 *
 * Por que dois adapters: em produção a API roda no Cloud Run, que escala
 * horizontalmente e abriria uma conexão TCP por instância — o suficiente para
 * esgotar o limite do Postgres. O driver serverless do Neon fala HTTP com o
 * pooler e não sofre desse problema. Em desenvolvimento, contra um Postgres
 * local em Docker, esse driver não se aplica e usamos o `pg` normal.
 */
function createAdapter(connectionString: string) {
  const isNeon = connectionString.includes('neon.tech');
  return isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
}

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: createAdapter(connectionString) });
}

export type { PrismaClient };
