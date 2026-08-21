import type { PrismaClient } from '@connect-gsa/db';
import { connectionListSchema, connectionStateSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import type { Env } from '../../env.js';
import { avisarConexaoAceita, avisarPedidoDeConexao } from '../push/push.eventos.js';
import type { AppInstance } from '../../types.js';
import { toCards } from '../directory/directory.service.js';
import {
  acceptConnection,
  connectionBuckets,
  removeConnection,
  requestConnection,
} from './connection.service.js';

const params = z.object({ id: z.uuid() });

export function registerConnectionRoutes(
  app: AppInstance,
  prisma: PrismaClient,
  env: Env,
): void {
  const contextoDeAviso = { prisma, env, log: app.log };
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
    async (request) => {
      const quemPediu = requireAuth(request).id;
      const connection = await requestConnection(prisma, quemPediu, request.params.id);

      // O aviso mais importante da rede: um pedido que ninguém vê é uma
      // conexão que não acontece. Disparado sem `await` — a resposta não espera
      // a entrega, e falhar na entrega não desfaz o pedido.
      void avisarPedidoDeConexao(contextoDeAviso, request.params.id, quemPediu);

      return { connection };
    },
  );

  app.post(
    '/connections/:id/accept',
    { schema: { params, response: { 200: z.object({ connection: connectionStateSchema }) } } },
    async (request) => {
      const quemAceitou = requireAuth(request).id;
      const connection = await acceptConnection(prisma, quemAceitou, request.params.id);

      void avisarConexaoAceita(contextoDeAviso, request.params.id, quemAceitou);

      return { connection };
    },
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
