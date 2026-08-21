import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';
import { testEnv } from '../../testing/app.js';
import { avisarComentario, avisarPedidoDeConexao, avisarReacao } from './push.eventos.js';
import { inscrever } from './push.service.js';

const prisma = testDb();

const comChaves = {
  ...testEnv,
  VAPID_PUBLIC_KEY:
    'BLPmQ9UvZjH6mbNdgiq0MxSq-xDH60BEwCFX6Sbv3-3tnQ7bnX35ksKEhhdKubp9pbZXHs9jAyJsTF7_799KsUc',
  VAPID_PRIVATE_KEY: 'AnXUsaN4k8iq0Hp-B6AHrIDl5dLt91bxA-RSedoisbs',
  VAPID_SUBJECT: 'mailto:contato@exemplo.test',
};

const log = { warn: () => undefined };

/** Captura o que seria mandado ao aparelho, sem sair para a rede. */
async function capturar(acao: () => Promise<void>) {
  const enviados: Record<string, string>[] = [];
  const webpush = await import('web-push');

  vi.spyOn(webpush.default, 'sendNotification').mockImplementation((_sub, corpo) => {
    enviados.push(JSON.parse(String(corpo)) as Record<string, string>);
    return Promise.resolve({ statusCode: 201, body: '', headers: {} });
  });

  await acao();
  return enviados;
}

beforeEach(async () => {
  await resetTestData();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await closeTestDb();
});

describe('o que o aviso carrega', () => {
  it('traz o PRIMEIRO nome e o destino, e nada de dado pessoal @spec:AC-160 @principle:P-002', async () => {
    const autor = await createTestUser({ email: 'autor@uni.br' });
    const quemReagiu = await createTestUser({ email: 'ana.ribeiro@uni.br' });
    await prisma.user.update({
      where: { id: quemReagiu.id },
      data: { name: 'Ana Ribeiro Nogueira' },
    });
    await inscrever(prisma, autor.id, {
      endpoint: 'https://push.exemplo.test/a',
      keys: { p256dh: 'k', auth: 's' },
    });
    const post = await prisma.post.create({
      data: { authorId: autor.id, content: 'texto secreto da publicação' },
      select: { id: true },
    });

    const enviados = await capturar(() =>
      avisarReacao({ prisma, env: comChaves, log }, post.id, quemReagiu.id),
    );

    expect(enviados).toHaveLength(1);
    const aviso = JSON.stringify(enviados[0]);

    // Um aviso aparece na tela BLOQUEADA, à vista de quem estiver por perto.
    expect(aviso).toContain('Ana');
    expect(aviso).not.toContain('Ribeiro');
    expect(aviso).not.toContain('@uni.br');
    expect(aviso).not.toContain('texto secreto');
    expect(enviados[0]?.['url']).toBe('/notificacoes');
  });

  it('o comentário avisa SEM o texto comentado @spec:AC-160', async () => {
    const autor = await createTestUser();
    const quemComentou = await createTestUser();
    await inscrever(prisma, autor.id, {
      endpoint: 'https://push.exemplo.test/b',
      keys: { p256dh: 'k', auth: 's' },
    });
    const post = await prisma.post.create({
      data: { authorId: autor.id, content: 'publicação' },
      select: { id: true },
    });
    await prisma.comment.create({
      data: { postId: post.id, authorId: quemComentou.id, content: 'comentário confidencial' },
    });

    const enviados = await capturar(() =>
      avisarComentario({ prisma, env: comChaves, log }, post.id, quemComentou.id),
    );

    // O texto do comentário é livre; mostrá-lo na tela bloqueada entrega o que
    // alguém escreveu a quem estiver por perto.
    expect(JSON.stringify(enviados[0])).not.toContain('confidencial');
  });

  it('ninguém é avisado da própria ação @spec:AC-160', async () => {
    const ana = await createTestUser();
    await inscrever(prisma, ana.id, {
      endpoint: 'https://push.exemplo.test/c',
      keys: { p256dh: 'k', auth: 's' },
    });
    const post = await prisma.post.create({
      data: { authorId: ana.id, content: 'minha publicação' },
      select: { id: true },
    });

    const enviados = await capturar(() =>
      avisarReacao({ prisma, env: comChaves, log }, post.id, ana.id),
    );

    expect(enviados).toEqual([]);
  });

  it('avisos do mesmo assunto se substituem em vez de empilhar', async () => {
    const alvo = await createTestUser();
    const quemPediu = await createTestUser();
    await inscrever(prisma, alvo.id, {
      endpoint: 'https://push.exemplo.test/d',
      keys: { p256dh: 'k', auth: 's' },
    });

    const enviados = await capturar(() =>
      avisarPedidoDeConexao({ prisma, env: comChaves, log }, alvo.id, quemPediu.id),
    );

    // Cinco reações na mesma publicação viram UM aviso, não cinco.
    expect(enviados[0]?.['tag']).toBe(`conexao:${quemPediu.id}`);
  });
});
