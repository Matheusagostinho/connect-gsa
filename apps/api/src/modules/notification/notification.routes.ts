import type { PrismaClient } from '@connect-gsa/db';
import { notificationFeedSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import type { AppInstance } from '../../types.js';
import { countUnread, listNotifications, markSeen } from './notification.service.js';

export function registerNotificationRoutes(app: AppInstance, prisma: PrismaClient): void {
  app.get(
    '/notifications',
    {
      schema: { response: { 200: notificationFeedSchema } },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (request) => listNotifications(prisma, requireAuth(request).id),
  );

  /** Só o número, para a navegação — que aparece em toda tela. */
  app.get(
    '/notifications/count',
    {
      schema: { response: { 200: z.object({ unreadCount: z.number().int().nonnegative() }) } },
      config: { rateLimit: { max: 240, timeWindow: '1 minute' } },
    },
    async (request) => ({ unreadCount: await countUnread(prisma, requireAuth(request).id) }),
  );

  app.post(
    '/notifications/seen',
    { schema: { response: { 200: z.object({ ok: z.literal(true) }) } } },
    async (request) => {
      await markSeen(prisma, requireAuth(request).id);
      return { ok: true as const };
    },
  );
}
