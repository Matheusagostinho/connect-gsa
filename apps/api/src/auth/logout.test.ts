import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { testEnv } from '../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../testing/db.js';
import { DEV_SESSION_COOKIE } from './dev-login.js';

const prisma = testDb();
const apps: FastifyInstance[] = [];

beforeEach(async () => {
  await resetTestData();
});

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

afterAll(async () => {
  await closeTestDb();
});

describe('sair da conta', () => {
  it('encerra a sessão e a área restrita volta a exigir autenticação @spec:AC-040', async () => {
    const app = await buildApp({ env: testEnv, prisma });
    apps.push(app);
    await app.ready();

    const ana = await createTestUser();

    const entrada = await app.inject({
      method: 'POST',
      url: '/api/dev/login',
      payload: { userId: ana.id },
    });
    const cookie = entrada.cookies.find((c) => c.name === DEV_SESSION_COOKIE)?.value ?? '';

    // Confere que a sessão realmente valia antes de sair — senão o teste
    // passaria mesmo se o login estivesse quebrado.
    const antes = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `${DEV_SESSION_COOKIE}=${cookie}` },
    });
    expect(antes.statusCode).toBe(200);

    const saida = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `${DEV_SESSION_COOKIE}=${cookie}` },
    });
    expect(saida.statusCode).toBe(200);

    // O cookie volta expirado, e o navegador para de mandá-lo.
    const limpo = saida.cookies.find((c) => c.name === DEV_SESSION_COOKIE);
    expect(limpo?.value).toBe('');

    const depois = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `${DEV_SESSION_COOKIE}=` },
    });
    expect(depois.statusCode).toBe(401);
  });

  it('sair sem estar dentro não é erro', async () => {
    const app = await buildApp({ env: testEnv, prisma });
    apps.push(app);
    await app.ready();

    const response = await app.inject({ method: 'POST', url: '/api/auth/logout' });

    expect(response.statusCode).toBe(200);
  });
});
