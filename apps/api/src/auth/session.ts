import type { PrismaClient, Role } from '@connect-gsa/db';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { unauthorized } from '../plugins/errors.js';
import type { Auth } from './better-auth.js';

/** O usuário autenticado, no formato mínimo de que as rotas precisam. */
export interface CurrentUser {
  id: string;
  role: Role;
  profileComplete: boolean;
}

/**
 * Como a identidade do requisitante é descoberta.
 *
 * É um ponto de extensão de propósito: em produção quem responde é o Better
 * Auth lendo o cookie de sessão; nos testes de rota, um resolvedor que lê um
 * cabeçalho. Sem essa costura, testar autorização exigiria simular o vaivém
 * completo do OAuth — e o que se quer verificar ali é a regra de permissão,
 * não o protocolo do Google.
 */
export type SessionResolver = (request: FastifyRequest) => Promise<string | undefined>;

declare module 'fastify' {
  interface FastifyRequest {
    /** Resolvido em `onRequest`; `undefined` quando não há sessão válida. */
    currentUser: CurrentUser | undefined;
    session: { userId: string } | undefined;
  }
}

/** Resolvedor de produção: identidade vem do cookie de sessão do Better Auth. */
export function betterAuthResolver(auth: Auth): SessionResolver {
  return async (request) => {
    const result = await auth.api
      .getSession({ headers: fromNodeHeaders(request.headers) })
      .catch(() => undefined);
    return result?.user?.id;
  };
}

/**
 * Resolve a sessão a cada requisição e expõe o usuário autenticado.
 *
 * Resolver antes das rotas — e não dentro de cada uma — é o que permite ao
 * limitador de taxa chavear por usuário em vez de por IP, e garante que
 * `requireAuth` nunca dependa de a rota ter lembrado de carregar a sessão.
 *
 * O papel vem SEMPRE do banco, nunca do token. Papel dentro do cookie seria
 * escalonamento de privilégio a uma edição de distância.
 */
export const sessionPlugin = fp(
  (app: FastifyInstance, opts: { resolve: SessionResolver; prisma: PrismaClient }) => {
    app.decorateRequest('currentUser', undefined);
    app.decorateRequest('session', undefined);

    app.addHook('onRequest', async (request) => {
      const userId = await opts.resolve(request);
      if (!userId) return;

      const user = await opts.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, profileComplete: true },
      });

      if (!user) return;

      request.session = { userId: user.id };
      request.currentUser = user;
    });

    return Promise.resolve();
  },
  { name: 'connect-gsa-session' },
);

/** Exige sessão válida e devolve o usuário — a porta de toda rota restrita (AC-019). */
export function requireAuth(request: FastifyRequest): CurrentUser {
  if (!request.currentUser) {
    throw unauthorized();
  }
  return request.currentUser;
}
