import type { Post } from '@connect-gsa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

async function embaixador(nome: string, role: 'ambassador' | 'moderator' | 'admin' = 'ambassador') {
  const [city, institution] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'UFPE' } }),
  ]);
  const user = await createTestUser({ role });
  return prisma.user.update({
    where: { id: user.id },
    data: {
      name: nome,
      slug: nome.toLowerCase(),
      course: 'Engenharia',
      profileComplete: true,
      cityId: city.id,
      institutionId: institution.id,
    },
  });
}

const feed = async (userId: string): Promise<Post[]> =>
  (await app.inject({ method: 'GET', url: '/api/feed', headers: asUser(userId) })).json<{
    posts: Post[];
  }>().posts;

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

describe('apagar o que é meu × moderar o que é de outro', () => {
  it('separa as duas coisas para quem tem poder de moderação @spec:AC-078', async () => {
    const [ana, bruno] = await Promise.all([
      embaixador('Ana', 'admin'),
      embaixador('Bruno'),
    ]);

    for (const [quem, texto] of [
      [ana, 'publicação da Ana'],
      [bruno, 'publicação do Bruno'],
    ] as const) {
      await app.inject({
        method: 'POST',
        url: '/api/posts',
        headers: asUser(quem.id),
        payload: { content: texto },
      });
    }

    const visto = await feed(ana.id);
    const meu = visto.find((p) => p.author.id === ana.id);
    const alheio = visto.find((p) => p.author.id === bruno.id);

    // A publicação dela: apagar. A de outra pessoa: moderar — nunca as duas.
    expect(meu).toMatchObject({ canDelete: true, canModerate: false });
    expect(alheio).toMatchObject({ canDelete: false, canModerate: true });
  });

  it('não oferece nada em publicação alheia para embaixador comum @spec:AC-079', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(bruno.id),
      payload: { content: 'publicação do Bruno' },
    });

    const [alheio] = await feed(ana.id);

    expect(alheio).toMatchObject({ canDelete: false, canModerate: false });
  });

  it('a moderação continua conseguindo remover de fato — a mudança é de aparência', async () => {
    const [ana, bruno] = await Promise.all([
      embaixador('Ana', 'moderator'),
      embaixador('Bruno'),
    ]);

    const criado = await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(bruno.id),
      payload: { content: 'publicação do Bruno' },
    });
    const post = criado.json<{ id: string }>();

    const removido = await app.inject({
      method: 'DELETE',
      url: `/api/posts/${post.id}`,
      headers: asUser(ana.id),
    });

    expect(removido.statusCode).toBe(204);
    await expect(prisma.post.count()).resolves.toBe(0);
  });

  it('embaixador comum continua sem conseguir remover publicação alheia @principle:P-004', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    const criado = await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(bruno.id),
      payload: { content: 'publicação do Bruno' },
    });
    const post = criado.json<{ id: string }>();

    const tentativa = await app.inject({
      method: 'DELETE',
      url: `/api/posts/${post.id}`,
      headers: asUser(ana.id),
    });

    expect(tentativa.statusCode).toBe(403);
    await expect(prisma.post.count()).resolves.toBe(1);
  });
});
