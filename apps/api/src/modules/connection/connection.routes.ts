import type { PrismaClient } from '@connect-gsa/db';
import { connectionListSchema, connectionStateSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import type { AppInstance } from '../../types.js';
import { toCards } from '../directory/directory.service.js';
import {
  acceptConnection,
  connectionBuckets,
  removeConnection,
  requestConnection,
} from './connection.service.js';

const params = z.object({ id: z.uuid() });

export function registerConnectionRoutes(app: AppInstance, prisma: PrismaClient): void {
  const CARD_SELECT = {
    id: true,
    slug: true,
    name: true,
    image: true,
    course: true,
    institution: { select: { name: true, campus: true, acronym: true } },
    city: { select: { name: true, state: true } },
    skills: { select: { slug: true, name: true, category: true } },
  } as const;

  app.get(
    '/connections',
    { schema: { response: { 200: connectionListSchema } } },
    async (request) => {
      const user = requireAuth(request);
      const buckets = await connectionBuckets(prisma, user.id);

      const todos = [...buckets.connected, ...buckets.received, ...buckets.sent];
      const pessoas = await prisma.user.findMany({
        where: { id: { in: todos } },
        select: CARD_SELECT,
      });

      const cartoes = await toCards(prisma, user.id, pessoas);
      const porId = new Map(cartoes.map((c) => [c.id, c]));
      const pegar = (ids: string[]) => ids.flatMap((id) => (porId.has(id) ? [porId.get(id)!] : []));

      return {
        connected: pegar(buckets.connected),
        received: pegar(buckets.received),
        sent: pegar(buckets.sent),
      };
    },
  );

  app.post(
    '/connections/:id',
    {
      schema: { params, response: { 200: z.object({ connection: connectionStateSchema }) } },
      config: { rateLimit: { max: 60, timeWindow: '10 minutes' } },
    },
    async (request) => ({
      connection: await requestConnection(prisma, requireAuth(request).id, request.params.id),
    }),
  );

  app.post(
    '/connections/:id/accept',
    { schema: { params, response: { 200: z.object({ connection: connectionStateSchema }) } } },
    async (request) => ({
      connection: await acceptConnection(prisma, requireAuth(request).id, request.params.id),
    }),
  );

  /** Recusar pedido e desfazer conexão são a mesma operação: apagar o laço. */
  app.delete(
    '/connections/:id',
    { schema: { params, response: { 200: z.object({ connection: connectionStateSchema }) } } },
    async (request) => ({
      connection: await removeConnection(prisma, requireAuth(request).id, request.params.id),
    }),
  );
}
