import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INVITE_COOKIE, readInviteTicket } from '../../auth/invite-ticket.js';
import { asUser, buildTestApp, testEnv } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';
import { generateInviteCode, hashInviteCode } from './invite.code.js';

const prisma = testDb();
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestData();
});

async function createInviteAs(userId: string) {
  return app.inject({
    method: 'POST',
    url: '/api/invites',
    headers: asUser(userId),
    payload: { validityDays: 30 },
  });
}

describe('rotas de convite', () => {
  it('só deixa a coordenação gerar convite @spec:AC-017 @principle:P-004', async () => {
    const [embaixador, admin] = await Promise.all([
      createTestUser({ role: 'ambassador' }),
      createTestUser({ role: 'admin' }),
    ]);

    const recusado = await createInviteAs(embaixador.id);
    expect(recusado.statusCode).toBe(403);
    await expect(prisma.inviteCode.count()).resolves.toBe(0);

    const aceito = await createInviteAs(admin.id);
    expect(aceito.statusCode).toBe(201);
    expect(aceito.json<{ code: string }>().code).toMatch(/^[0-9a-f]{32}$/);
    await expect(prisma.inviteCode.count()).resolves.toBe(1);
  });

  it('não deixa gerar convite sem sessão @spec:AC-019', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invites',
      payload: { validityDays: 30 },
    });

    expect(response.statusCode).toBe(401);
  });

  it('emite bilhete httpOnly para um convite válido, sem revelar o código', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const criado = await createInviteAs(admin.id);
    const { code } = criado.json<{ code: string }>();

    const response = await app.inject({
      method: 'POST',
      url: '/api/invites/check',
      payload: { code },
    });

    expect(response.statusCode).toBe(200);

    const cookie = response.cookies.find((c) => c.name === INVITE_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite?.toLowerCase()).toBe('lax');

    // O bilhete carrega o hash, nunca o código em claro (P-009).
    expect(cookie?.value).not.toContain(code);
    expect(readInviteTicket(cookie?.value, testEnv.BETTER_AUTH_SECRET)).toBe(hashInviteCode(code));

    // Conferir NÃO consome: um login abandonado no meio não queima o convite.
    const invite = await prisma.inviteCode.findFirstOrThrow();
    expect(invite.usedAt).toBeNull();
  });

  it('recusa convite inexistente com a mesma resposta de um expirado', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invites/check',
      payload: { code: generateInviteCode() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ message: string }>().message).toMatch(/inválido, expirado ou já/i);
    expect(response.cookies.find((c) => c.name === INVITE_COOKIE)).toBeUndefined();
  });

  it('bloqueia quem fica chutando código de convite @spec:AC-008', async () => {
    const respostas: number[] = [];

    // O limite da rota é 10 tentativas por 10 minutos.
    for (let tentativa = 0; tentativa < 14; tentativa += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/invites/check',
        payload: { code: generateInviteCode() },
        remoteAddress: '203.0.113.10',
      });
      respostas.push(response.statusCode);
    }

    expect(respostas.filter((status) => status === 429).length).toBeGreaterThan(0);

    // E a resposta de bloqueio não diz nada sobre os códigos tentados.
    const ultimo = respostas.at(-1);
    expect(ultimo).toBe(429);
  });
});
