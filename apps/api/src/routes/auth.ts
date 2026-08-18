import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Auth } from '../auth/better-auth.js';
import { DEV_SESSION_COOKIE } from '../auth/dev-login.js';
import type { AppInstance } from '../types.js';

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

/**
 * Sair da conta (AC-040).
 *
 * Encerra os DOIS caminhos de sessão de uma vez: a do Better Auth, que é a real,
 * e o cookie de desenvolvimento. Limpar só um deixaria a pessoa "saindo" e
 * continuando autenticada pelo outro — o pior resultado possível para quem
 * clicou em sair num computador compartilhado do laboratório.
 *
 * Responde 200 mesmo quando não havia sessão: sair é idempotente, e devolver
 * erro para quem já está de fora só produz tela de erro sem motivo.
 */
export function registerLogoutRoute(app: AppInstance, auth: Auth): void {
  app.post(
    '/auth/logout',
    { schema: { response: { 200: z.object({ ok: z.literal(true) }) } } },
    async (request, reply) => {
      await auth.api
        .signOut({ headers: fromNodeHeaders(request.headers), asResponse: true })
        .then((response) => {
          // Repassa os `set-cookie` de expiração que o Better Auth emite.
          const cookies = response.headers.getSetCookie?.() ?? [];
          for (const cookie of cookies) reply.header('set-cookie', cookie);
        })
        .catch(() => undefined);

      reply.clearCookie(DEV_SESSION_COOKIE, { path: '/' });

      return { ok: true as const };
    },
  );
}
