import type { PrismaClient } from '@connect-gsa/db';
import type {
  Comment,
  CreateComment,
  CreatePost,
  Post,
  Reaction,
} from '@connect-gsa/shared';
import { connectionStatesFor } from '../connection/connection.service.js';
import { forbidden, notFound } from '../../plugins/errors.js';
import { sanitizeMultiline } from '../profile/sanitize.js';
import type { StorageDriver } from '../media/storage.js';
import { POST_SELECT, toPost, type PostRow, type ViewerContext } from './post.mapper.js';

/** Contagem por reação e a reação de quem está lendo, para um conjunto de posts. */
export async function loadReactions(
  prisma: PrismaClient,
  postIds: readonly string[],
  viewerId: string,
): Promise<{
  counts: Map<string, Partial<Record<Reaction, number>>>;
  mine: Map<string, Reaction>;
}> {
  const counts = new Map<string, Partial<Record<Reaction, number>>>();
  const mine = new Map<string, Reaction>();

  if (postIds.length === 0) return { counts, mine };

  // Duas consultas para a página inteira, não duas por post: o agrupamento
  // acontece no Postgres, que é onde ele é barato.
  const [agrupadas, minhas] = await Promise.all([
    prisma.postReaction.groupBy({
      by: ['postId', 'kind'],
      where: { postId: { in: [...postIds] } },
      _count: { _all: true },
    }),
    prisma.postReaction.findMany({
      where: { postId: { in: [...postIds] }, userId: viewerId },
      select: { postId: true, kind: true },
    }),
  ]);

  for (const linha of agrupadas) {
    const atual = counts.get(linha.postId) ?? {};
    atual[linha.kind] = linha._count._all;
    counts.set(linha.postId, atual);
  }

  for (const linha of minhas) mine.set(linha.postId, linha.kind);

  return { counts, mine };
}

export async function hydratePosts(
  prisma: PrismaClient,
  rows: readonly PostRow[],
  viewer: ViewerContext,
  storage: StorageDriver,
): Promise<Post[]> {
  // Reações e estado de conexão em duas consultas para a página inteira — o
  // cartão precisa dos dois, e uma consulta por post seria uma por linha exibida.
  const [{ counts, mine }, conexoes] = await Promise.all([
    loadReactions(
      prisma,
      rows.map((r) => r.id),
      viewer.userId,
    ),
    connectionStatesFor(prisma, viewer.userId, [...new Set(rows.map((r) => r.author.id))]),
  ]);

  return rows.map((row) =>
    toPost(
      row,
      viewer,
      storage,
      counts.get(row.id) ?? {},
      mine.get(row.id) ?? null,
      conexoes.get(row.author.id) ?? 'none',
    ),
  );
}

export async function createPost(
  prisma: PrismaClient,
  viewer: ViewerContext,
  storage: StorageDriver,
  input: CreatePost,
): Promise<Post> {
  const row = await prisma.post.create({
    // Sanitizado na ENTRADA (P-006): o que chega ao Postgres já está inerte.
    data: {
      content: sanitizeMultiline(input.content),
      mediaKey: input.mediaKey ?? null,
      authorId: viewer.userId,
    },
    select: POST_SELECT,
  });

  return toPost(row, viewer, storage, {}, null);
}

export async function deletePost(
  prisma: PrismaClient,
  viewer: ViewerContext,
  storage: StorageDriver,
  postId: string,
): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, mediaKey: true },
  });

  if (!post) throw notFound('Post não encontrado.');
  if (post.authorId !== viewer.userId && !viewer.isModerator) throw forbidden();

  await prisma.post.delete({ where: { id: postId } });

  if (post.mediaKey) {
    // A imagem some junto. Falhar aqui não desfaz a exclusão do post: o registro
    // já foi removido, e um objeto órfão é problema menor que um post que
    // "não apagou" aos olhos de quem pediu.
    await storage.remove(post.mediaKey).catch(() => undefined);
  }
}

/**
 * Aplica a reação de uma pessoa a um post.
 *
 * As três situações possíveis, e o motivo de estarem juntas numa transação:
 * escolher outra reação SUBSTITUI a anterior (ASM-008) e escolher a mesma
 * DESFAZ. Os dois casos mexem na linha da reação e no contador do post, e um
 * sem o outro deixaria a contagem mentindo.
 */
export async function reactToPost(
  prisma: PrismaClient,
  viewer: ViewerContext,
  postId: string,
  reaction: Reaction,
): Promise<{ reactionCounts: Partial<Record<Reaction, number>>; myReaction: Reaction | null }> {
  const existe = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!existe) throw notFound('Post não encontrado.');

  const atual = await prisma.postReaction.findUnique({
    where: { postId_userId: { postId, userId: viewer.userId } },
    select: { id: true, kind: true },
  });

  await prisma.$transaction(async (tx) => {
    if (!atual) {
      await tx.postReaction.create({ data: { postId, userId: viewer.userId, kind: reaction } });
      await tx.post.update({ where: { id: postId }, data: { reactionCount: { increment: 1 } } });
      return;
    }

    if (atual.kind === reaction) {
      // Mesma reação de novo: desfaz (AC-032).
      await tx.postReaction.delete({ where: { id: atual.id } });
      await tx.post.update({ where: { id: postId }, data: { reactionCount: { decrement: 1 } } });
      return;
    }

    // Troca: o total continua o mesmo, só muda de qual reação ele é (AC-031).
    await tx.postReaction.update({ where: { id: atual.id }, data: { kind: reaction } });
  });

  const { counts, mine } = await loadReactions(prisma, [postId], viewer.userId);
  return { reactionCounts: counts.get(postId) ?? {}, myReaction: mine.get(postId) ?? null };
}

export async function listComments(
  prisma: PrismaClient,
  viewer: ViewerContext,
  postId: string,
): Promise<Comment[]> {
  const linhas = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      content: true,
      createdAt: true,
      authorId: true,
      author: {
        select: {
          id: true,
          slug: true,
          name: true,
          image: true,
          course: true,
          institution: { select: { acronym: true, name: true } },
        },
      },
    },
  });

  return linhas.map((linha) => ({
    id: linha.id,
    content: linha.content,
    createdAt: linha.createdAt.toISOString(),
    author: {
      id: linha.author.id,
      slug: linha.author.slug ?? linha.author.id,
      name: linha.author.name,
      imageUrl: linha.author.image,
      course: linha.author.course,
      institutionAcronym:
        linha.author.institution?.acronym ?? linha.author.institution?.name ?? null,
      // O cartão de comentário não oferece conectar; o do post é que oferece.
      connection: linha.authorId === viewer.userId ? 'self' : 'none',
    },
    canDelete: linha.authorId === viewer.userId,
    canModerate: linha.authorId !== viewer.userId && viewer.isModerator,
  }));
}

export async function createComment(
  prisma: PrismaClient,
  viewer: ViewerContext,
  postId: string,
  input: CreateComment,
): Promise<Comment[]> {
  const existe = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!existe) throw notFound('Post não encontrado.');

  await prisma.$transaction([
    prisma.comment.create({
      data: { postId, authorId: viewer.userId, content: sanitizeMultiline(input.content) },
    }),
    prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
  ]);

  return listComments(prisma, viewer, postId);
}

export async function deleteComment(
  prisma: PrismaClient,
  viewer: ViewerContext,
  commentId: string,
): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, postId: true },
  });

  if (!comment) throw notFound('Comentário não encontrado.');
  if (comment.authorId !== viewer.userId && !viewer.isModerator) throw forbidden();

  await prisma.$transaction([
    prisma.comment.delete({ where: { id: commentId } }),
    prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
  ]);
}
