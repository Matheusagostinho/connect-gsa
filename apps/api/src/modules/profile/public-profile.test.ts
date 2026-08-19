import type { Post, PublicProfile } from '@connect-gsa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

async function perfilCompleto(userId: string, nome: string) {
  const [city, institution] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'IFNMG', campus: 'Pirapora' } }),
  ]);

  const resposta = await app.inject({
    method: 'PATCH',
    url: '/api/me',
    headers: asUser(userId),
    payload: {
      name: nome,
      institutionId: institution.id,
      cityId: city.id,
      course: 'Ciência da Computação',
      bio: '',
      skillSlugs: ['react'],
      links: [],
    },
  });
  expect(resposta.statusCode).toBe(200);
  return resposta.json<{ slug: string }>();
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

describe('perfil público', () => {
  it('tem endereço legível derivado do nome @spec:AC-046', async () => {
    const ana = await createTestUser();

    const { slug } = await perfilCompleto(ana.id, 'Ana Ribeiro');

    expect(slug).toBe('ana-ribeiro');

    const porSlug = await app.inject({
      method: 'GET',
      url: `/api/profiles/${slug}`,
      headers: asUser(ana.id),
    });
    expect(porSlug.statusCode).toBe(200);
    expect(porSlug.json<PublicProfile>().id).toBe(ana.id);
  });

  it('mantém o endereço quando a pessoa muda o nome de exibição @spec:AC-046', async () => {
    const ana = await createTestUser();
    const { slug } = await perfilCompleto(ana.id, 'Ana Ribeiro');

    // Um endereço que já circulou em conversa não pode deixar de funcionar.
    const depois = await perfilCompleto(ana.id, 'Ana R. Nogueira');

    expect(depois.slug).toBe(slug);
  });

  it('mostra as publicações da pessoa, da mais recente para a mais antiga @spec:AC-047', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const { slug } = await perfilCompleto(ana.id, 'Ana Ribeiro');
    await perfilCompleto(bruno.id, 'Bruno Tavares');

    for (const texto of ['primeiro post', 'segundo post']) {
      await app.inject({
        method: 'POST',
        url: '/api/posts',
        headers: asUser(ana.id),
        payload: { content: texto },
      });
    }
    // Post de outra pessoa não deve aparecer no perfil da Ana.
    await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(bruno.id),
      payload: { content: 'post do bruno' },
    });

    const resposta = await app.inject({
      method: 'GET',
      url: `/api/profiles/${slug}/posts`,
      headers: asUser(bruno.id),
    });

    const posts = resposta.json<Post[]>();
    expect(posts.map((p) => p.content)).toEqual(['segundo post', 'primeiro post']);
  });

  it('não entrega o e-mail de ninguém no perfil nem nas publicações @spec:AC-048 @principle:P-002', async () => {
    const [ana, bruno] = await Promise.all([
      createTestUser({ email: 'ana.contato@uni.br' }),
      createTestUser({ email: 'bruno.contato@uni.br' }),
    ]);
    const { slug } = await perfilCompleto(ana.id, 'Ana Ribeiro');
    await perfilCompleto(bruno.id, 'Bruno Tavares');

    await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(ana.id),
      payload: { content: 'post visível' },
    });

    const perfil = await app.inject({
      method: 'GET',
      url: `/api/profiles/${slug}`,
      headers: asUser(bruno.id),
    });
    const posts = await app.inject({
      method: 'GET',
      url: `/api/profiles/${slug}/posts`,
      headers: asUser(bruno.id),
    });

    for (const corpo of [perfil.body, posts.body]) {
      expect(corpo).not.toContain('ana.contato@uni.br');
      expect(corpo).not.toContain('bruno.contato@uni.br');
    }
    expect(perfil.json()).not.toHaveProperty('email');
  });

  it('esconde perfil incompleto de terceiros', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    await perfilCompleto(bruno.id, 'Bruno Tavares');

    const resposta = await app.inject({
      method: 'GET',
      url: `/api/profiles/${ana.id}`,
      headers: asUser(bruno.id),
    });

    expect(resposta.statusCode).toBe(404);
  });
});
