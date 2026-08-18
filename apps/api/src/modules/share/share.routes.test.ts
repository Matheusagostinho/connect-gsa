import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

const WHATSAPP = 'WhatsApp/2.23.20.0';
const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

async function completeProfile(userId: string) {
  const [city, institution] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'UFPE' } }),
  ]);

  await app.inject({
    method: 'PATCH',
    url: '/api/me',
    headers: asUser(userId),
    payload: {
      name: 'Ana Souza',
      institutionId: institution.id,
      cityId: city.id,
      course: 'Ciência da Computação',
      bio: 'Bio secreta que não deve aparecer em prévia.',
      skills: [],
      links: [],
    },
  });
}

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

describe('prévia de link', () => {
  it('entrega Open Graph para o rastreador do WhatsApp', async () => {
    const ana = await createTestUser();
    await completeProfile(ana.id);

    const response = await app.inject({
      method: 'GET',
      url: `/s/profile/${ana.id}`,
      headers: { 'user-agent': WHATSAPP },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('<meta property="og:title" content="Ana Souza no ConnectGSA">');
    expect(response.body).toContain('UFPE');
  });

  it('não expõe e-mail, cidade nem bio na prévia @principle:P-002', async () => {
    const ana = await createTestUser({ email: 'ana.contato@uni.br' });
    await completeProfile(ana.id);

    const response = await app.inject({
      method: 'GET',
      url: `/s/profile/${ana.id}`,
      headers: { 'user-agent': WHATSAPP },
    });

    // Uma prévia é vista por qualquer pessoa em qualquer grupo.
    expect(response.body).not.toContain('ana.contato@uni.br');
    expect(response.body).not.toContain('Bio secreta');
    expect(response.body).not.toContain('Recife');
  });

  it('manda pessoa direto para o aplicativo', async () => {
    const ana = await createTestUser();
    await completeProfile(ana.id);

    const response = await app.inject({
      method: 'GET',
      url: `/s/profile/${ana.id}`,
      headers: { 'user-agent': CHROME },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers['location']).toBe(`http://localhost:5173/perfil/${ana.id}`);
  });

  it('não vaza existência de perfil: id desconhecido devolve prévia genérica', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/s/profile/11111111-1111-4111-8111-111111111111',
      headers: { 'user-agent': WHATSAPP },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<meta property="og:title" content="ConnectGSA">');
  });
});
