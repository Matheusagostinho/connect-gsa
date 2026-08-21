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

/**
 * Escolhe o banco dos testes — e se recusa a usar o de desenvolvimento.
 *
 * `resetTestData` apaga tabelas inteiras. Sem esta trava, um `pnpm test`
 * distraído levaria junto as pessoas e convites que você tinha semeado para
 * navegar pelo aplicativo. A recusa é explícita porque o estrago é silencioso:
 * os testes passariam normalmente e você só descobriria ao voltar para a tela.
 */
function testConnectionString(): string {
  const test = process.env.TEST_DATABASE_URL;
  const dev = process.env.DATABASE_URL;

  if (!test) {
    throw new Error(
      'TEST_DATABASE_URL não definida. Copie .env.example para .env — os testes precisam de ' +
        'um banco próprio, senão apagam os dados de desenvolvimento.',
    );
  }

  if (test === dev) {
    throw new Error(
      'TEST_DATABASE_URL é igual a DATABASE_URL. Os testes limpam tabelas inteiras e apagariam ' +
        'seu banco de desenvolvimento. Use um banco separado (ex.: connectgsa_test).',
    );
  }

  return test;
}

export function testDb(): PrismaClient {
  client ??= createPrismaClient(testConnectionString());
  return client;
}

/** Limpa só o que os testes criam. Municípios e instituições vêm do seed e ficam. */
export async function resetTestData(): Promise<void> {
  const prisma = testDb();
  // Ordem importa onde não há cascade a partir do que apagamos primeiro.
  await prisma.pushSubscription.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postReaction.deleteMany();
  await prisma.post.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.allowedEmail.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.user.deleteMany();
  // Instituição proposta é dado de teste; a curada vem do seed e fica.
  await prisma.institution.deleteMany({ where: { status: 'pending' } });
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
