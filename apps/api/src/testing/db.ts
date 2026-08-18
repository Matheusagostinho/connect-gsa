import 'dotenv/config';
import { createPrismaClient, type PrismaClient } from '@connect-gsa/db';

/**
 * Postgres real para os testes de integração.
 *
 * Convite consumido sob corrida (AC-007) e unicidade de e-mail são garantias do
 * BANCO, não da aplicação. Um mock nunca reprovaria uma implementação que
 * dependesse de checar-e-depois-gravar — que é justamente o erro que estes
 * testes existem para pegar. Sobe com `docker compose up -d`.
 */
let client: PrismaClient | undefined;

export function testDb(): PrismaClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não definida — copie .env.example para .env');
    }
    client = createPrismaClient(connectionString);
  }
  return client;
}

/** Limpa só o que os testes criam. Municípios e instituições vêm do seed e ficam. */
export async function resetTestData(): Promise<void> {
  const prisma = testDb();
  await prisma.inviteCode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.allowedEmail.deleteMany();
  await prisma.user.deleteMany();
}

export async function closeTestDb(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}

let sequence = 0;

/** Cria um usuário mínimo, apenas para servir de dono de convite ou de sessão. */
export async function createTestUser(
  overrides: { role?: 'ambassador' | 'moderator' | 'admin'; email?: string } = {},
) {
  sequence += 1;
  return testDb().user.create({
    data: {
      name: `Embaixador ${sequence}`,
      email: overrides.email ?? `embaixador${sequence}.${Date.now()}@uni.br`,
      emailVerified: true,
      role: overrides.role ?? 'ambassador',
    },
  });
}
