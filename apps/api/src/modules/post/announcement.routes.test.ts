import type { FeedPage, Post } from '@connect-gsa/shared';
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

const publicarAviso = (userId: string, texto: string) =>
  app.inject({
    method: 'POST',
    url: '/api/announcements',
    headers: asUser(userId),
    payload: { content: texto },
  });

const quadro = async (userId: string): Promise<Post[]> =>
  (await app.inject({ method: 'GET', url: '/api/announcements', headers: asUser(userId) }))
    .json<Post[]>();

const destaque = async (userId: string): Promise<Post | null> =>
  (await app.inject({ method: 'GET', url: '/api/announcements/latest', headers: asUser(userId) }))
    .json<Post | null>();

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

describe('quadro de avisos', () => {
  it('só a coordenação publica @spec:AC-090 @principle:P-004', async () => {
    const [comum, moderador] = await Promise.all([
      embaixador('Comum'),
      embaixador('Moderador', 'moderator'),
    ]);

    const recusado = await publicarAviso(comum.id, 'aviso indevido');
    expect(recusado.statusCode).toBe(403);
    await expect(prisma.post.count({ where: { kind: 'announcement' } })).resolves.toBe(0);

    const aceito = await publicarAviso(moderador.id, 'Encontro na quinta, 19h');
    expect(aceito.statusCode).toBe(201);
    expect(aceito.json<Post>()).toMatchObject({
      kind: 'announcement',
      content: 'Encontro na quinta, 19h',
    });
  });

  it('não mistura aviso com o feed comum @spec:AC-091', async () => {
    const [ana, admin] = await Promise.all([embaixador('Ana'), embaixador('Admin', 'admin')]);

    await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(ana.id),
      payload: { content: 'publicação comum' },
    });
    await publicarAviso(admin.id, 'comunicado oficial');

    const feed = (
      await app.inject({ method: 'GET', url: '/api/feed', headers: asUser(ana.id) })
    ).json<FeedPage>();

    expect(feed.posts.map((p) => p.content)).toEqual(['publicação comum']);
    expect(feed.posts.every((p) => p.kind === 'feed')).toBe(true);

    // E o quadro traz o aviso, não a publicação comum.
    expect((await quadro(ana.id)).map((a) => a.content)).toEqual(['comunicado oficial']);
  });

  it('lista do mais recente para o mais antigo @spec:AC-092', async () => {
    const [ana, admin] = await Promise.all([embaixador('Ana'), embaixador('Admin', 'admin')]);

    for (const texto of ['primeiro aviso', 'segundo aviso', 'terceiro aviso']) {
      await publicarAviso(admin.id, texto);
    }

    const avisos = await quadro(ana.id);

    expect(avisos.map((a) => a.content)).toEqual([
      'terceiro aviso',
      'segundo aviso',
      'primeiro aviso',
    ]);
  });

  it('destaca o aviso mais recente para quem abre o feed @spec:AC-093', async () => {
    const [ana, admin] = await Promise.all([embaixador('Ana'), embaixador('Admin', 'admin')]);

    expect(await destaque(ana.id)).toBeNull();

    await publicarAviso(admin.id, 'aviso antigo');
    await publicarAviso(admin.id, 'aviso mais novo');

    expect(await destaque(ana.id)).toMatchObject({ content: 'aviso mais novo' });
  });

  it('tira do destaque o aviso que já envelheceu', async () => {
    const [ana, admin] = await Promise.all([embaixador('Ana'), embaixador('Admin', 'admin')]);

    const criado = await publicarAviso(admin.id, 'aviso de um mês atrás');
    await prisma.post.update({
      where: { id: criado.json<Post>().id },
      data: { createdAt: new Date(Date.now() - 30 * 86_400_000) },
    });

    // Aviso velho no topo vira ruído e ensina a ignorar o espaço.
    expect(await destaque(ana.id)).toBeNull();
    // Mas continua no quadro, como histórico.
    expect(await quadro(ana.id)).toHaveLength(1);
  });

  it('aceita reação e comentário como qualquer publicação @spec:AC-094', async () => {
    const [ana, admin] = await Promise.all([embaixador('Ana'), embaixador('Admin', 'admin')]);
    const aviso = (await publicarAviso(admin.id, 'Prazo prorrogado')).json<Post>();

    const reacao = await app.inject({
      method: 'POST',
      url: `/api/posts/${aviso.id}/reaction`,
      headers: asUser(ana.id),
      payload: { reaction: 'learned' },
    });
    const comentario = await app.inject({
      method: 'POST',
      url: `/api/posts/${aviso.id}/comments`,
      headers: asUser(ana.id),
      payload: { content: 'Prorrogado até quando?' },
    });

    expect(reacao.statusCode).toBe(200);
    expect(comentario.statusCode).toBe(201);

    const [noQuadro] = await quadro(ana.id);
    expect(noQuadro).toMatchObject({ reactionCounts: { learned: 1 }, commentCount: 1 });
  });

  it('só a coordenação remove um aviso @spec:AC-095', async () => {
    const [ana, admin] = await Promise.all([embaixador('Ana'), embaixador('Admin', 'admin')]);
    const aviso = (await publicarAviso(admin.id, 'Aviso com erro')).json<Post>();

    const recusado = await app.inject({
      method: 'DELETE',
      url: `/api/posts/${aviso.id}`,
      headers: asUser(ana.id),
    });
    expect(recusado.statusCode).toBe(403);

    const removido = await app.inject({
      method: 'DELETE',
      url: `/api/posts/${aviso.id}`,
      headers: asUser(admin.id),
    });
    expect(removido.statusCode).toBe(204);
    await expect(prisma.post.count({ where: { kind: 'announcement' } })).resolves.toBe(0);
  });

  it('recusa aviso vazio e aviso longo demais', async () => {
    const admin = await embaixador('Admin', 'admin');

    for (const texto of ['', '  ', 'x'.repeat(1001)]) {
      expect((await publicarAviso(admin.id, texto)).statusCode).toBe(400);
    }
  });

  it('exige sessão', async () => {
    for (const url of ['/api/announcements', '/api/announcements/latest']) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
    }
  });
});
