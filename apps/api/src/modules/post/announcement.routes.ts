import type { PrismaClient } from '@connect-gsa/db';
import { createAnnouncementSchema, postSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import { assertCan } from '../../authz/guard.js';
import type { AppInstance } from '../../types.js';
import type { StorageDriver } from '../media/storage.js';
import { sanitizeMultiline } from '../profile/sanitize.js';
import { POST_SELECT, toPost, type ViewerContext } from './post.mapper.js';
import { hydratePosts } from './post.service.js';

/**
 * Quadro de avisos: os comunicados oficiais do programa.
 *
 * Separado do feed de propósito. Comunicado não deveria competir por atenção com
 * publicação pessoal, nem ser ordenado por engajamento — um aviso importante que
 * ninguém curtiu afundaria, e é justamente o que não pode acontecer.
 *
 * A autorização reusa o CASL que já existia: `manage Announcement` é de
 * moderação e administração. Não há regra nova aqui, só o uso da que havia.
 */

/** Depois disso, o aviso deixa de ser destaque no feed e vira histórico do quadro. */
const DIAS_EM_DESTAQUE = 14;

export function registerAnnouncementRoutes(
  app: AppInstance,
  prisma: PrismaClient,
  storage: StorageDriver,
): void {
  const viewerOf = (request: Parameters<typeof requireAuth>[0]): ViewerContext => {
    const user = requireAuth(request);
    return { userId: user.id, isModerator: user.role === 'moderator' || user.role === 'admin' };
  };

  app.get(
    '/announcements',
    {
      schema: { response: { 200: z.array(postSchema) } },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (request) => {
      const viewer = viewerOf(request);

      const rows = await prisma.post.findMany({
        where: { kind: 'announcement' },
        // Cronológico puro: comunicado não disputa atenção (AC-092).
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
        select: POST_SELECT,
      });

      return hydratePosts(prisma, rows, viewer, storage);
    },
  );

  /**
   * O aviso em destaque no feed.
   *
   * Um quadro que ninguém visita é um quadro morto — daí trazer o comunicado
   * mais recente para onde as pessoas já estão. Depois de duas semanas ele sai
   * do destaque: aviso velho no topo vira ruído e ensina a ignorar o espaço.
   */
  app.get(
    '/announcements/latest',
    { schema: { response: { 200: postSchema.nullable() } } },
    async (request) => {
      const viewer = viewerOf(request);

      const row = await prisma.post.findFirst({
        where: {
          kind: 'announcement',
          createdAt: { gte: new Date(Date.now() - DIAS_EM_DESTAQUE * 86_400_000) },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: POST_SELECT,
      });

      if (!row) return null;

      const [post] = await hydratePosts(prisma, [row], viewer, storage);
      return post ?? null;
    },
  );

  app.post(
    '/announcements',
    {
      schema: { body: createAnnouncementSchema, response: { 201: postSchema } },
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const user = requireAuth(request);
      // Quem publica comunicado oficial é a coordenação (AC-090).
      assertCan(user, 'create', 'Announcement');

      const row = await prisma.post.create({
        data: {
          kind: 'announcement',
          content: sanitizeMultiline(request.body.content),
          mediaKey: request.body.mediaKey ?? null,
          authorId: user.id,
        },
        select: POST_SELECT,
      });

      const viewer: ViewerContext = { userId: user.id, isModerator: true };
      return reply.status(201).send(toPost(row, viewer, storage, {}, null));
    },
  );
}
