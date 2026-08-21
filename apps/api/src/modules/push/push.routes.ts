import type { PrismaClient } from '@connect-gsa/db';
import { pushStatusSchema, pushSubscriptionSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import type { Env } from '../../env.js';
import type { AppInstance } from '../../types.js';
import { desinscrever, estaInscrito, inscrever, pushConfigurado } from './push.service.js';

/**
 * Inscrição de aparelho para aviso por notificação.
 *
 * Três rotas e nada mais: saber se dá para autorizar, autorizar, e sair. O
 * ENVIO não tem rota — ele acontece no mesmo caminho que já cria o evento.
 */
export function registerPushRoutes(app: AppInstance, prisma: PrismaClient, env: Env): void {
  app.get(
    '/push/status',
    { schema: { response: { 200: pushStatusSchema } } },
    async (request) => {
      const user = requireAuth(request);

      return {
        // A chave PÚBLICA vai para o cliente por construção — é ela que o
        // navegador usa para cifrar a inscrição. Nula quando o servidor não
        // tem chaves: aí a tela nem oferece o botão.
        publicKey: pushConfigurado(env) ? (env.VAPID_PUBLIC_KEY ?? null) : null,
        inscrito: await estaInscrito(prisma, user.id),
      };
    },
  );

  app.post(
    '/push/subscribe',
    {
      schema: {
        body: pushSubscriptionSchema,
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
    },
    async (request) => {
      const user = requireAuth(request);
      await inscrever(prisma, user.id, request.body);
      return { ok: true as const };
    },
  );

  app.post(
    '/push/unsubscribe',
    {
      schema: {
        body: z.object({ endpoint: z.url().max(1000) }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
    },
    async (request) => {
      // A sessão é exigida, mas a remoção é pelo ENDPOINT: quem tem o endpoint
      // é o próprio aparelho, e apagá-lo nunca prejudica outra pessoa. Amarrar
      // ao `userId` quebraria o caso que mais importa — o computador
      // compartilhado, onde a inscrição pode ter mudado de dono.
      requireAuth(request);
      await desinscrever(prisma, request.body.endpoint);
      return { ok: true as const };
    },
  );
}
