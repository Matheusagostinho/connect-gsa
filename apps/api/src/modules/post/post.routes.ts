import type { PrismaClient } from '@connect-gsa/db';
import {
  commentSchema,
  createCommentSchema,
  createPostSchema,
  postSchema,
  reactToPostSchema,
} from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import type { AppInstance } from '../../types.js';
import type { StorageDriver } from '../media/storage.js';
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  hydratePosts,
  listComments,
  reactToPost,
} from './post.service.js';
import { POST_SELECT, type ViewerContext } from './post.mapper.js';

const paramsSchema = z.object({ id: z.uuid() });

export function registerPostRoutes(
  app: AppInstance,
  prisma: PrismaClient,
  storage: StorageDriver,
): void {
  /** Quem está lendo, com o poder de moderação já resolvido. */
  const viewerOf = (request: Parameters<typeof requireAuth>[0]): ViewerContext => {
    const user = requireAuth(request);
    return { userId: user.id, isModerator: user.role === 'moderator' || user.role === 'admin' };
  };

  app.post(
    '/posts',
    {
      schema: { body: createPostSchema, response: { 201: postSchema } },
      // Publicar é a ação mais cara da rede e o alvo óbvio de spam.
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const post = await createPost(prisma, viewerOf(request), storage, request.body);
      return reply.status(201).send(post);
    },
  );

  app.delete(
    '/posts/:id',
    { schema: { params: paramsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await deletePost(prisma, viewerOf(request), storage, request.params.id);
      return reply.status(204).send(null);
    },
  );

  app.post(
    '/posts/:id/reaction',
    {
      schema: {
        params: paramsSchema,
        body: reactToPostSchema,
        response: {
          200: postSchema.pick({ reactionCounts: true, myReaction: true }),
        },
      },
    },
    async (request) =>
      reactToPost(prisma, viewerOf(request), request.params.id, request.body.reaction),
  );

  app.get(
    '/posts/:id/comments',
    { schema: { params: paramsSchema, response: { 200: z.array(commentSchema) } } },
    async (request) => listComments(prisma, viewerOf(request), request.params.id),
  );

  app.post(
    '/posts/:id/comments',
    {
      schema: {
        params: paramsSchema,
        body: createCommentSchema,
        response: { 201: z.array(commentSchema) },
      },
      config: { rateLimit: { max: 60, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const comments = await createComment(
        prisma,
        viewerOf(request),
        request.params.id,
        request.body,
      );
      return reply.status(201).send(comments);
    },
  );

  app.delete(
    '/comments/:id',
    { schema: { params: paramsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await deleteComment(prisma, viewerOf(request), request.params.id);
      return reply.status(204).send(null);
    },
  );
}

/**
 * Posts de uma pessoa, para o perfil dela (AC-047).
 *
 * Ordem cronológica pura aqui, ao contrário do feed: no perfil de alguém a
 * pergunta é "o que essa pessoa vem fazendo", e ranquear por engajamento
 * esconderia o post mais recente atrás de um antigo que viralizou.
 */
export function registerAuthorPostsRoute(
  app: AppInstance,
  prisma: PrismaClient,
  storage: StorageDriver,
): void {
  app.get(
    '/profiles/:id/posts',
    {
      schema: {
        params: z.object({ id: z.string().min(1).max(80) }),
        response: { 200: z.array(postSchema) },
      },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (request) => {
      const user = requireAuth(request);
      const viewer: ViewerContext = {
        userId: user.id,
        isModerator: user.role === 'moderator' || user.role === 'admin',
      };

      const autor = await prisma.user.findFirst({
        where: {
          profileComplete: true,
          OR: [{ slug: request.params.id }, { id: request.params.id }],
        },
        select: { id: true },
      });

      if (!autor) return [];

      const rows = await prisma.post.findMany({
        where: { authorId: autor.id, kind: 'feed' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 30,
        select: POST_SELECT,
      });

      return hydratePosts(prisma, rows, viewer, storage);
    },
  );
}
