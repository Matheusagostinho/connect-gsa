import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import type { Env } from '../env.js';
import { testEnv } from '../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../testing/db.js';
import {
  DEV_SESSION_COOKIE,
  DevLoginInProductionError,
  assertDevOnly,
  devSessionResolver,
  registerDevLoginRoutes,
} from './dev-login.js';

/**
 * O login de desenvolvimento é uma porta dos fundos deliberada: quem alcança a
 * rota entra como qualquer usuário. Estes testes existem para garantir que ela
 * não possa acompanhar a aplicação até produção — a trava precisa ser um fato
 * verificável, não uma intenção registrada em comentário.
 */
const prisma = testDb();
const apps: FastifyInstance[] = [];

async function buildWith(env: Env): Promise<FastifyInstance> {
  const app = await buildApp({ env, prisma });
  apps.push(app);
  await app.ready();
  return app;
}

beforeEach(async () => {
  await resetTestData();
});

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

afterAll(async () => {
  await closeTestDb();
});

describe('login de desenvolvimento', () => {
  it('recusa ser registrado em produção', () => {
    const producao: Env = { ...testEnv, NODE_ENV: 'production' };

    expect(() => assertDevOnly(producao)).toThrow(DevLoginInProductionError);
    expect(() => registerDevLoginRoutes({} as never, prisma, producao)).toThrow(
      DevLoginInProductionError,
    );
    expect(() => devSessionResolver(producao, () => Promise.resolve(undefined))).toThrow(
      DevLoginInProductionError,
    );
  });

  it('não expõe nenhuma rota de desenvolvimento quando a aplicação sobe em produção @spec:AC-021', async () => {
    // A aplicação de produção precisa subir normalmente — a trava impede a porta
    // dos fundos, não a inicialização.
    const app = await buildWith({ ...testEnv, NODE_ENV: 'production' });

    for (const [method, url] of [
      ['GET', '/api/dev/users'],
      ['POST', '/api/dev/login'],
      ['POST', '/api/dev/logout'],
    ] as const) {
      const response = await app.inject({ method, url, payload: {} });
      expect(response.statusCode).toBe(404);
    }
  });

  it('entra como o usuário escolhido em desenvolvimento @spec:AC-020', async () => {
    const app = await buildWith(testEnv);
    const ana = await createTestUser({ role: 'admin' });

    const lista = await app.inject({ method: 'GET', url: '/api/dev/users' });
    expect(lista.statusCode).toBe(200);
    expect(lista.json<{ id: string }[]>().map((u) => u.id)).toContain(ana.id);

    const login = await app.inject({
      method: 'POST',
      url: '/api/dev/login',
      payload: { userId: ana.id },
    });

    expect(login.statusCode).toBe(200);
    const cookie = login.cookies.find((c) => c.name === DEV_SESSION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);

    // E a sessão vale de fato: a rota restrita passa a responder.
    const me = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `${DEV_SESSION_COOKIE}=${cookie?.value ?? ''}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json<{ id: string }>().id).toBe(ana.id);
  });

  it('não aceita cookie de desenvolvimento forjado', async () => {
    const app = await buildWith(testEnv);
    const ana = await createTestUser();

    // Sem assinatura válida, o identificador do usuário não vale nada.
    const me = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `${DEV_SESSION_COOKIE}=${ana.id}` },
    });

    expect(me.statusCode).toBe(401);
  });

  it('sai da sessão de desenvolvimento', async () => {
    const app = await buildWith(testEnv);
    const ana = await createTestUser();

    const login = await app.inject({
      method: 'POST',
      url: '/api/dev/login',
      payload: { userId: ana.id },
    });
    const cookie = login.cookies.find((c) => c.name === DEV_SESSION_COOKIE);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/dev/logout',
      headers: { cookie: `${DEV_SESSION_COOKIE}=${cookie?.value ?? ''}` },
    });

    expect(logout.statusCode).toBe(200);
    expect(logout.cookies.find((c) => c.name === DEV_SESSION_COOKIE)?.value).toBe('');
  });
});
