import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import type { Auth } from '../auth/better-auth.js';

/**
 * Repassa `/api/auth/*` para o Better Auth.
 *
 * A biblioteca fala Fetch API (Request/Response) e o Fastify fala Node; esta
 * rota é a tradução entre os dois. Toda a lógica de OAuth, sessão e cookie
 * mora do lado do Better Auth — aqui não há decisão de segurança, só transporte.
 */
export function registerAuthRoutes(app: FastifyInstance, auth: Auth): void {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    // O Better Auth precisa do corpo cru para validar assinatura de payload.
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const url = new URL(request.url, `${request.protocol}://${request.hostname}`);

      const response = await auth.handler(
        new Request(url.toString(), {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          ...(request.body === undefined || request.method === 'GET'
            ? {}
            : { body: JSON.stringify(request.body) }),
        }),
      );

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        // `set-cookie` pode vir repetido; `append` preserva todos.
        if (key.toLowerCase() === 'set-cookie') reply.header(key, value);
        else reply.header(key, value);
      });

      const text = await response.text();
      return reply.send(text.length > 0 ? text : null);
    },
  });
}
