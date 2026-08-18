import sharp from 'sharp';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Comment, Post } from '@connect-gsa/shared';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

async function publica(userId: string, content: string): Promise<Post> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/posts',
    headers: asUser(userId),
    payload: { content },
  });
  expect(response.statusCode).toBe(201);
  return response.json<Post>();
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

describe('posts', () => {
  it('publica e o post aparece com autor e horário @spec:AC-023', async () => {
    const ana = await createTestUser();

    const post = await publica(ana.id, 'Comecei um projeto com Gemini hoje.');

    expect(post).toMatchObject({
      content: 'Comecei um projeto com Gemini hoje.',
      author: { id: ana.id },
      commentCount: 0,
      myReaction: null,
    });
    expect(Date.parse(post.createdAt)).not.toBeNaN();
  });

  it('desarma HTML colado no post @spec:AC-024 @principle:P-006', async () => {
    const ana = await createTestUser();

    const post = await publica(ana.id, '<script>alert(1)</script>Olá');

    expect(post.content).toBe('Olá');
    const gravado = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(gravado.content).toBe('Olá');
  });

  it('recusa post vazio e post longo demais @spec:AC-025', async () => {
    const ana = await createTestUser();

    for (const content of ['', '   ', 'x'.repeat(1001)]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/posts',
        headers: asUser(ana.id),
        payload: { content },
      });
      expect(response.statusCode).toBe(400);
    }

    await expect(prisma.post.count()).resolves.toBe(0);
  });

  it('não deixa publicar sem sessão @spec:AC-019', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/posts',
      payload: { content: 'oi' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('reações', () => {
  it('reage e a contagem daquela reação sobe @spec:AC-030', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const post = await publica(ana.id, 'Projeto novo no ar');

    const response = await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/reaction`,
      headers: asUser(bruno.id),
      payload: { reaction: 'liftoff' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ reactionCounts: { liftoff: 1 }, myReaction: 'liftoff' });
  });

  it('trocar de reação substitui, não soma @spec:AC-031', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const post = await publica(ana.id, 'Projeto novo');

    const reagir = (reaction: string) =>
      app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/reaction`,
        headers: asUser(bruno.id),
        payload: { reaction },
      });

    await reagir('liftoff');
    const depois = await reagir('respect');

    expect(depois.json()).toEqual({ reactionCounts: { respect: 1 }, myReaction: 'respect' });

    // O total continua sendo UMA reação — a garantia é do índice único do banco.
    const gravado = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(gravado.reactionCount).toBe(1);
    await expect(prisma.postReaction.count({ where: { postId: post.id } })).resolves.toBe(1);
  });

  it('reagir de novo com a mesma reação desfaz @spec:AC-032', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const post = await publica(ana.id, 'Projeto novo');

    const reagir = () =>
      app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/reaction`,
        headers: asUser(bruno.id),
        payload: { reaction: 'learned' },
      });

    await reagir();
    const desfeito = await reagir();

    expect(desfeito.json()).toEqual({ reactionCounts: {}, myReaction: null });
    const gravado = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(gravado.reactionCount).toBe(0);
  });

  it('recusa reação que não existe no conjunto', async () => {
    const ana = await createTestUser();
    const post = await publica(ana.id, 'Projeto novo');

    const response = await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/reaction`,
      headers: asUser(ana.id),
      payload: { reaction: 'curtir' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('comentários', () => {
  it('comenta e o contador do post sobe @spec:AC-033', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const post = await publica(ana.id, 'Alguém já usou Vertex AI?');

    const response = await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(bruno.id),
      payload: { content: 'Usei no TCC, posso te mostrar' },
    });

    expect(response.statusCode).toBe(201);
    const comentarios = response.json<Comment[]>();
    expect(comentarios).toHaveLength(1);
    expect(comentarios[0]).toMatchObject({
      content: 'Usei no TCC, posso te mostrar',
      author: { id: bruno.id },
    });

    const gravado = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(gravado.commentCount).toBe(1);
  });

  it('só o autor do comentário — ou a moderação — pode apagá-lo @spec:AC-034 @principle:P-004', async () => {
    const [ana, bruno, moderador] = await Promise.all([
      createTestUser(),
      createTestUser(),
      createTestUser({ role: 'moderator' }),
    ]);
    const post = await publica(ana.id, 'Post com conversa');

    const criados = await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(bruno.id),
      payload: { content: 'comentário do bruno' },
    });
    const comentario = criados.json<Comment[]>()[0]!;

    const recusado = await app.inject({
      method: 'DELETE',
      url: `/api/comments/${comentario.id}`,
      headers: asUser(ana.id),
    });
    expect(recusado.statusCode).toBe(403);
    await expect(prisma.comment.count()).resolves.toBe(1);

    const permitido = await app.inject({
      method: 'DELETE',
      url: `/api/comments/${comentario.id}`,
      headers: asUser(moderador.id),
    });
    expect(permitido.statusCode).toBe(204);
    await expect(prisma.comment.count()).resolves.toBe(0);

    const atualizado = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(atualizado.commentCount).toBe(0);
  });

  it('não entrega e-mail de ninguém junto do post ou do comentário @principle:P-002', async () => {
    const [ana, bruno] = await Promise.all([
      createTestUser({ email: 'ana.privada@uni.br' }),
      createTestUser({ email: 'bruno.privado@uni.br' }),
    ]);
    const post = await publica(ana.id, 'Post visível');

    const comentarios = await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(bruno.id),
      payload: { content: 'oi' },
    });

    const feed = await app.inject({ method: 'GET', url: '/api/feed', headers: asUser(bruno.id) });

    for (const corpo of [comentarios.body, feed.body]) {
      expect(corpo).not.toContain('ana.privada@uni.br');
      expect(corpo).not.toContain('bruno.privado@uni.br');
    }
  });
});

describe('envio de imagem', () => {
  async function envia(userId: string, buffer: Buffer, filename: string, url: string) {
    const boundary = '----connectgsa';
    const corpo = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `Content-Type: image/jpeg\r\n\r\n`,
      ),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    return app.inject({
      method: 'POST',
      url,
      headers: {
        ...asUser(userId),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: corpo,
    });
  }

  it('aceita imagem de post e devolve chave e URL', async () => {
    const ana = await createTestUser();
    const imagem = await sharp({
      create: { width: 800, height: 600, channels: 3, background: '#4285f4' },
    })
      .jpeg()
      .toBuffer();

    const response = await envia(ana.id, imagem, 'foto.jpg', '/api/media/post-image');

    expect(response.statusCode).toBe(201);
    expect(response.json<{ key: string; url: string }>().key).toMatch(/^posts\/.+\.webp$/);
  });

  it('recusa arquivo que não é imagem @spec:AC-027', async () => {
    const ana = await createTestUser();
    const falso = Buffer.concat([
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
      Buffer.alloc(1024, 0x41),
    ]);

    const response = await envia(ana.id, falso, 'malicioso.jpg', '/api/media/post-image');

    expect(response.statusCode).toBe(400);
  });

  it('troca a foto de perfil @spec:AC-029', async () => {
    const ana = await createTestUser();
    const imagem = await sharp({
      create: { width: 900, height: 500, channels: 3, background: '#34a853' },
    })
      .png()
      .toBuffer();

    const response = await envia(ana.id, imagem, 'perfil.png', '/api/media/avatar');

    expect(response.statusCode).toBe(200);
    expect(response.json<{ imageUrl: string | null }>().imageUrl).toContain('/media/avatars/');
  });

  it('não deixa enviar imagem sem sessão', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/media/post-image',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      payload: Buffer.from('--x--\r\n'),
    });

    expect(response.statusCode).toBe(401);
  });
});
