import type { PrismaClient } from '@connect-gsa/db';
import { feedPageSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import type { AppInstance } from '../../types.js';
import type { StorageDriver } from '../media/storage.js';
import { buildFeed } from './feed.service.js';

export function registerFeedRoutes(
  app: AppInstance,
  prisma: PrismaClient,
  storage: StorageDriver,
): void {
  app.get(
    '/feed',
    {
      schema: {
        querystring: z.object({ cursor: z.string().max(500).optional() }),
        response: { 200: feedPageSchema },
      },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (request) => {
      const user = requireAuth(request);
      return buildFeed(
        prisma,
        { userId: user.id, isModerator: user.role === 'moderator' || user.role === 'admin' },
        storage,
        request.query.cursor,
      );
    },
  );
}
