import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { AccountExport } from '@connect-gsa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp, testEnv } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

async function embaixador(nome: string, email?: string) {
  const [city, institution] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'UFPE' } }),
  ]);
  const user = await createTestUser(email ? { email } : {});
  return prisma.user.update({
    where: { id: user.id },
    data: {
      name: nome,
      slug: nome.toLowerCase(),
      course: 'Engenharia',
      bio: 'Bio de teste',
      profileComplete: true,
      cityId: city.id,
      institutionId: institution.id,
    },
  });
}

const publicar = async (userId: string, texto: string, mediaKey?: string) => {
  const r = await app.inject({
    method: 'POST',
    url: '/api/posts',
    headers: asUser(userId),
    payload: { content: texto, ...(mediaKey ? { mediaKey } : {}) },
  });
  return r.json<{ id: string }>();
};

const exportar = async (userId: string) =>
  app.inject({ method: 'GET', url: '/api/me/export', headers: asUser(userId) });

const excluir = (userId: string, confirmation: string) =>
  app.inject({
    method: 'DELETE',
    url: '/api/me',
    headers: asUser(userId),
    payload: { confirmation },
  });

/** Envia uma imagem de verdade e devolve a chave dela no armazenamento. */
async function enviarImagem(userId: string): Promise<string> {
  const imagem = await sharp({
    create: { width: 200, height: 200, channels: 3, background: '#4285f4' },
  })
    .jpeg()
    .toBuffer();

  const boundary = '----connectgsa';
  const corpo = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="f.jpg"\r\n` +
        `Content-Type: image/jpeg\r\n\r\n`,
    ),
    imagem,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const r = await app.inject({
    method: 'POST',
    url: '/api/media/post-image',
    headers: { ...asUser(userId), 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: corpo,
  });

  return r.json<{ key: string }>().key;
}

const arquivoExiste = async (chave: string): Promise<boolean> => {
  try {
    await readFile(path.resolve(testEnv.MEDIA_LOCAL_DIR, chave));
    return true;
  } catch {
    return false;
  }
};

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

describe('exportar meus dados', () => {
  it('devolve um arquivo estruturado, com data de geração @spec:AC-069', async () => {
    const ana = await embaixador('Ana');

    const resposta = await exportar(ana.id);

    expect(resposta.statusCode).toBe(200);
    expect(resposta.headers['content-disposition']).toContain('attachment');

    const dados = resposta.json<AccountExport>();
    expect(dados.format).toBe(1);
    expect(Date.parse(dados.exportedAt)).not.toBeNaN();
  });

  it('traz perfil, publicações, comentários, reações e conexões @spec:AC-070', async () => {
    const [ana, bruno] = await Promise.all([
      embaixador('Ana', 'ana.titular@uni.br'),
      embaixador('Bruno'),
    ]);

    const meuPost = await publicar(ana.id, 'Publicação minha');
    const postDoBruno = await publicar(bruno.id, 'Publicação do Bruno');

    await app.inject({
      method: 'POST',
      url: `/api/posts/${postDoBruno.id}/comments`,
      headers: asUser(ana.id),
      payload: { content: 'comentário meu' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/posts/${postDoBruno.id}/reaction`,
      headers: asUser(ana.id),
      payload: { reaction: 'learned' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/connections/${bruno.id}`,
      headers: asUser(ana.id),
    });

    const dados = (await exportar(ana.id)).json<AccountExport>();

    // O e-mail dela entra: é dado dela, e portabilidade sem ele é pela metade.
    expect(dados.profile.email).toBe('ana.titular@uni.br');
    expect(dados.profile.name).toBe('Ana');
    expect(dados.posts.map((p) => p.id)).toEqual([meuPost.id]);
    expect(dados.comments.map((c) => c.content)).toEqual(['comentário meu']);
    expect(dados.reactions.map((r) => r.reaction)).toEqual(['learned']);
    expect(dados.connections.map((c) => c.name)).toEqual(['Bruno']);
  });

  it('não entrega e-mail de terceiros @spec:AC-071 @principle:P-002', async () => {
    const [ana, bruno] = await Promise.all([
      embaixador('Ana', 'ana.titular@uni.br'),
      embaixador('Bruno', 'bruno.terceiro@uni.br'),
    ]);
    const post = await publicar(ana.id, 'Publicação minha');

    await app.inject({
      method: 'POST',
      url: `/api/posts/${post.id}/comments`,
      headers: asUser(bruno.id),
      payload: { content: 'comentário do bruno' },
    });

    const resposta = await exportar(ana.id);

    expect(resposta.body).toContain('ana.titular@uni.br');
    expect(resposta.body).not.toContain('bruno.terceiro@uni.br');
  });

  it('exige sessão', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/me/export' })).statusCode).toBe(401);
  });
});

describe('excluir minha conta', () => {
  it('recusa sem a confirmação escrita, e nada é apagado @spec:AC-076', async () => {
    const ana = await embaixador('Ana');
    await publicar(ana.id, 'Publicação');

    for (const confirmacao of ['', 'sim', 'excluir']) {
      const resposta = await excluir(ana.id, confirmacao);
      expect(resposta.statusCode).toBe(400);
    }

    await expect(prisma.user.count({ where: { id: ana.id } })).resolves.toBe(1);
    await expect(prisma.post.count()).resolves.toBe(1);
  });

  it('apaga a conta e o perfil deixa de responder @spec:AC-072', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    expect((await excluir(ana.id, 'EXCLUIR')).statusCode).toBe(200);

    await expect(prisma.user.count({ where: { id: ana.id } })).resolves.toBe(0);

    const perfil = await app.inject({
      method: 'GET',
      url: '/api/profiles/ana',
      headers: asUser(bruno.id),
    });
    expect(perfil.statusCode).toBe(404);
  });

  it('leva junto publicações, comentários e reações @spec:AC-073', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);
    const meuPost = await publicar(ana.id, 'Minha publicação');
    const postDoBruno = await publicar(bruno.id, 'Publicação do Bruno');

    await app.inject({
      method: 'POST',
      url: `/api/posts/${postDoBruno.id}/comments`,
      headers: asUser(ana.id),
      payload: { content: 'comentário meu' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/posts/${postDoBruno.id}/reaction`,
      headers: asUser(ana.id),
      payload: { reaction: 'liftoff' },
    });

    await excluir(ana.id, 'EXCLUIR');

    await expect(prisma.post.count({ where: { id: meuPost.id } })).resolves.toBe(0);
    await expect(prisma.comment.count({ where: { authorId: ana.id } })).resolves.toBe(0);
    await expect(prisma.postReaction.count({ where: { userId: ana.id } })).resolves.toBe(0);
    // A publicação do Bruno continua — ela não é dela para apagar.
    await expect(prisma.post.count({ where: { id: postDoBruno.id } })).resolves.toBe(1);
  });

  it('apaga as imagens do armazenamento, não só as linhas @spec:AC-074 @principle:P-001 @principle:P-012', async () => {
    const ana = await embaixador('Ana');
    const chave = await enviarImagem(ana.id);
    await publicar(ana.id, 'Com imagem', chave);

    expect(await arquivoExiste(chave)).toBe(true);

    await excluir(ana.id, 'EXCLUIR');

    // Sem isto, o arquivo continuaria acessível por URL indefinidamente.
    expect(await arquivoExiste(chave)).toBe(false);
  });

  it('mantém corretos os contadores das publicações de terceiros @spec:AC-075', async () => {
    const [ana, bruno, carla] = await Promise.all([
      embaixador('Ana'),
      embaixador('Bruno'),
      embaixador('Carla'),
    ]);
    const post = await publicar(bruno.id, 'Publicação do Bruno');

    for (const quem of [ana, carla]) {
      await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/reaction`,
        headers: asUser(quem.id),
        payload: { reaction: 'liftoff' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/posts/${post.id}/comments`,
        headers: asUser(quem.id),
        payload: { content: `comentário de ${quem.name}` },
      });
    }

    const antes = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect([antes.reactionCount, antes.commentCount]).toEqual([2, 2]);

    await excluir(ana.id, 'EXCLUIR');

    // Sem o acerto, ficariam em 2 para sempre — mentindo, sem ninguém perceber.
    const depois = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect([depois.reactionCount, depois.commentCount]).toEqual([1, 1]);

    const reaisReacoes = await prisma.postReaction.count({ where: { postId: post.id } });
    const reaisComentarios = await prisma.comment.count({ where: { postId: post.id } });
    expect([depois.reactionCount, depois.commentCount]).toEqual([reaisReacoes, reaisComentarios]);
  });

  it('encerra a sessão junto @spec:AC-077', async () => {
    const ana = await embaixador('Ana');

    const saida = await excluir(ana.id, 'EXCLUIR');
    expect(saida.cookies.find((c) => c.name === 'cgsa_dev_session')?.value).toBe('');

    // A sessão apontava para um usuário que não existe mais.
    const depois = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(ana.id) });
    expect(depois.statusCode).toBe(401);
  });

  it('desfaz as conexões que a pessoa tinha', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    await app.inject({ method: 'POST', url: `/api/connections/${bruno.id}`, headers: asUser(ana.id) });
    await app.inject({
      method: 'POST',
      url: `/api/connections/${ana.id}/accept`,
      headers: asUser(bruno.id),
    });

    await excluir(ana.id, 'EXCLUIR');

    await expect(prisma.connection.count()).resolves.toBe(0);
  });

  it('exige sessão', async () => {
    const resposta = await app.inject({
      method: 'DELETE',
      url: '/api/me',
      payload: { confirmation: 'EXCLUIR' },
    });
    expect(resposta.statusCode).toBe(401);
  });
});
