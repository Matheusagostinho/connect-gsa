import type { NotificationFeed } from '@connect-gsa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

async function embaixador(nome: string) {
  const [city, institution] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'UFPE' } }),
  ]);
  const user = await createTestUser();
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

const publicar = async (userId: string, texto: string) =>
  (
    await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(userId),
      payload: { content: texto },
    })
  ).json<{ id: string }>();

const notificacoes = async (userId: string) =>
  (await app.inject({ method: 'GET', url: '/api/notifications', headers: asUser(userId) }))
    .json<NotificationFeed>();

const contador = async (userId: string) =>
  (await app.inject({ method: 'GET', url: '/api/notifications/count', headers: asUser(userId) }))
    .json<{ unreadCount: number }>().unreadCount;

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

describe('notificações', () => {
  it('junta pedido de conexão, reação e comentário num lugar só @spec:AC-065', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);
    const post = await publicar(ana.id, 'Projeto novo no ar');

    await app.inject({ method: 'POST', url: `/api/connections/${ana.id}`, headers: asUser(bruno.id) });
    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/reaction`,
      headers: asUser(bruno.id),
      payload: { reaction: 'together' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(bruno.id),
      payload: { content: 'Posso ajudar nisso' },
    });

    const { notifications } = await notificacoes(ana.id);

    expect(notifications.map((n) => n.kind).sort()).toEqual([
      'comment',
      'connectionRequest',
      'reaction',
    ]);
    expect(notifications.every((n) => n.actor.id === bruno.id)).toBe(true);

    const reacao = notifications.find((n) => n.kind === 'reaction');
    expect(reacao?.reaction).toBe('together');
    expect(reacao?.post?.excerpt).toBe('Projeto novo no ar');
  });

  it('ordena da mais recente para a mais antiga @spec:AC-065', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);
    const post = await publicar(ana.id, 'Post');

    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/reaction`,
      headers: asUser(bruno.id),
      payload: { reaction: 'liftoff' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(bruno.id),
      payload: { content: 'depois' },
    });

    const { notifications } = await notificacoes(ana.id);
    const datas = notifications.map((n) => Date.parse(n.createdAt));

    expect([...datas].sort((a, b) => b - a)).toEqual(datas);
  });

  it('conta as não lidas e zera depois de olhar @spec:AC-066 @spec:AC-067', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);
    const post = await publicar(ana.id, 'Post');

    await app.inject({ method: 'POST', url: `/api/connections/${ana.id}`, headers: asUser(bruno.id) });
    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/reaction`,
      headers: asUser(bruno.id),
      payload: { reaction: 'liftoff' },
    });

    expect(await contador(ana.id)).toBe(2);
    expect((await notificacoes(ana.id)).unreadCount).toBe(2);

    await app.inject({ method: 'POST', url: '/api/notifications/seen', headers: asUser(ana.id) });

    expect(await contador(ana.id)).toBe(0);

    // Visto não é apagado: a lista continua, só para de contar como nova.
    const depois = await notificacoes(ana.id);
    expect(depois.notifications).toHaveLength(2);
    expect(depois.unreadCount).toBe(0);
    expect(depois.notifications.every((n) => n.unread === false)).toBe(true);
  });

  it('volta a contar o que aconteceu depois de eu olhar @spec:AC-066', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);
    const post = await publicar(ana.id, 'Post');

    await app.inject({ method: 'POST', url: '/api/notifications/seen', headers: asUser(ana.id) });
    expect(await contador(ana.id)).toBe(0);

    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(bruno.id),
      payload: { content: 'novidade' },
    });

    expect(await contador(ana.id)).toBe(1);
  });

  it('não me notifica do que eu mesmo fiz @spec:AC-068', async () => {
    const ana = await embaixador('Ana');
    const post = await publicar(ana.id, 'Post meu');

    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/reaction`,
      headers: asUser(ana.id),
      payload: { reaction: 'liftoff' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(ana.id),
      payload: { content: 'comentário meu' },
    });

    const { notifications, unreadCount } = await notificacoes(ana.id);

    expect(notifications).toEqual([]);
    expect(unreadCount).toBe(0);
  });

  it('avisa quem pediu que a conexão foi aceita, e não quem aceitou', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    await app.inject({ method: 'POST', url: `/api/connections/${bruno.id}`, headers: asUser(ana.id) });
    await app.inject({
      method: 'POST',
      url: `/api/connections/${ana.id}/accept`,
      headers: asUser(bruno.id),
    });

    const daAna = await notificacoes(ana.id);
    const doBruno = await notificacoes(bruno.id);

    expect(daAna.notifications.map((n) => n.kind)).toEqual(['connectionAccepted']);
    // O Bruno aceitou; ele não precisa ser avisado do próprio aceite, e o
    // pedido que ele tinha recebido deixou de estar pendente.
    expect(doBruno.notifications).toEqual([]);
  });

  it('não entrega e-mail de ninguém @principle:P-002', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);
    await app.inject({ method: 'POST', url: `/api/connections/${ana.id}`, headers: asUser(bruno.id) });

    const resposta = await app.inject({
      method: 'GET',
      url: '/api/notifications',
      headers: asUser(ana.id),
    });

    expect(resposta.body).not.toContain(bruno.email);
  });

  it('exige sessão', async () => {
    for (const url of ['/api/notifications', '/api/notifications/count']) {
      expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
    }
  });
});
