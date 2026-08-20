import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INVITE_QUOTA } from '@connect-gsa/shared';
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
    payload: {},
  });
}

describe('rotas de convite', () => {
  it('deixa o embaixador comum gerar convite @spec:AC-017 @spec:AC-131', async () => {
    const embaixador = await createTestUser({ role: 'ambassador' });

    const aceito = await createInviteAs(embaixador.id);

    expect(aceito.statusCode).toBe(201);
    expect(aceito.json<{ code: string }>().code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    await expect(prisma.inviteCode.count()).resolves.toBe(1);
  });

  it('recusa depois do teto do embaixador, com o motivo @spec:AC-131 @principle:P-004', async () => {
    const embaixador = await createTestUser({ role: 'ambassador' });

    for (let i = 0; i < INVITE_QUOTA.max; i += 1) {
      expect((await createInviteAs(embaixador.id)).statusCode).toBe(201);
    }

    const recusado = await createInviteAs(embaixador.id);

    // O teto é o que passou a segurar o portão no lugar da permissão: uma conta
    // comprometida não pode virar torneira de convites.
    expect(recusado.statusCode).toBe(403);
    expect(recusado.json<{ message: string }>().message).toMatch(/convites/i);
    await expect(prisma.inviteCode.count()).resolves.toBe(INVITE_QUOTA.max);
  });

  it('coordenação e moderação não têm teto @spec:AC-132', async () => {
    for (const role of ['admin', 'moderator'] as const) {
      const pessoa = await createTestUser({ role });

      for (let i = 0; i < INVITE_QUOTA.max + 2; i += 1) {
        expect((await createInviteAs(pessoa.id)).statusCode).toBe(201);
      }
    }
  });

  it('não deixa gerar convite sem sessão @spec:AC-019', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invites',
      payload: {},
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

    // Conferir não marca nada: o convite só é datado quando alguém de fato entra.
    const invite = await prisma.inviteCode.findFirstOrThrow();
    expect(invite.lastUsedAt).toBeNull();
  });

  it('recusa convite inexistente com a mesma resposta de um expirado', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/invites/check',
      payload: { code: generateInviteCode() },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ message: string }>().message).toMatch(/inválido ou expirado/i);
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

  it('o convite nasce valendo quinze dias @spec:AC-149', async () => {
    const embaixador = await createTestUser({ role: 'ambassador' });

    // Corpo vazio de propósito: é o que a tela manda, e quem aplica o padrão é
    // o `createInviteSchema`. O prazo é o que sobrou segurando o portão depois
    // que o uso único saiu (P-009), então ele merece prova própria.
    const resposta = await createInviteAs(embaixador.id);

    const { expiresAt } = resposta.json<{ expiresAt: string }>();
    const dias = (new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000);

    expect(dias).toBeGreaterThan(14.9);
    expect(dias).toBeLessThan(15.1);
  });
});

describe('quem convidou', () => {
  async function conviteDe(userId: string) {
    const resposta = await app.inject({
      method: 'POST',
      url: '/api/invites',
      headers: asUser(userId),
      payload: {},
    });
    return resposta.json<{ code: string; shareUrl: string }>();
  }

  it('o link leva o código no caminho @spec:AC-134', async () => {
    const ana = await createTestUser({ role: 'admin' });
    const { code, shareUrl } = await conviteDe(ana.id);

    // `/convite/ABC5EK9M` se lê e se dita; `?c=` no meio de uma URL não.
    expect(shareUrl).toContain(`/convite/${code}`);
  });

  it('a página do convite diz quem convidou, só o primeiro nome @spec:AC-135', async () => {
    const ana = await createTestUser({ role: 'admin' });
    await prisma.user.update({ where: { id: ana.id }, data: { name: 'Ana Ribeiro Souza' } });
    const { code } = await conviteDe(ana.id);

    const resposta = await app.inject({ method: 'GET', url: `/api/invites/${code}` });

    expect(resposta.statusCode).toBe(200);
    // Nome completo transformaria o link num jeito de descobrir quem está na
    // rede sem entrar nela — e a rede ser fechada é o ponto.
    expect(resposta.json<{ invitedBy: string }>().invitedBy).toBe('Ana');
    expect(resposta.body).not.toContain('Souza');
  });

  it('não vira oráculo: inexistente e expirado respondem igual @spec:AC-136 @spec:AC-150', async () => {
    const ana = await createTestUser({ role: 'admin' });

    const inexistente = await app.inject({
      method: 'GET',
      url: `/api/invites/${generateInviteCode()}`,
    });

    const { code: vencido } = await conviteDe(ana.id);
    await prisma.inviteCode.updateMany({
      where: { codeHash: hashInviteCode(vencido) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expirado = await app.inject({ method: 'GET', url: `/api/invites/${vencido}` });

    // Sobraram dois motivos de recusa — "já usado" saiu da lista em 2026-08-20.
    // Distinguir os dois entregaria de graça o oráculo que o limite de
    // tentativas existe para negar.
    for (const resposta of [inexistente, expirado]) {
      expect(resposta.statusCode).toBe(400);
      expect(resposta.json<{ message: string }>().message).toBe('Convite inválido ou expirado.');
    }
  });

  it('o convite já usado continua mostrando quem convidou @spec:AC-146', async () => {
    const ana = await createTestUser({ role: 'admin' });
    await prisma.user.update({ where: { id: ana.id }, data: { name: 'Ana Ribeiro' } });
    const { code } = await conviteDe(ana.id);
    await prisma.inviteCode.updateMany({
      where: { codeHash: hashInviteCode(code) },
      data: { lastUsedAt: new Date() },
    });

    const resposta = await app.inject({ method: 'GET', url: `/api/invites/${code}` });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json<{ invitedBy: string }>().invitedBy).toBe('Ana');
  });

  it('não revela nome nenhum quando o convite não presta @spec:AC-136', async () => {
    const ana = await createTestUser({ role: 'admin' });
    await prisma.user.update({ where: { id: ana.id }, data: { name: 'Ana Ribeiro' } });
    const { code } = await conviteDe(ana.id);
    await prisma.inviteCode.updateMany({
      where: { codeHash: hashInviteCode(code) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const resposta = await app.inject({ method: 'GET', url: `/api/invites/${code}` });

    expect(resposta.body).not.toContain('Ana');
  });
});
