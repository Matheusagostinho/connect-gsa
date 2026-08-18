import type { PrismaClient } from '@connect-gsa/db';
import { z } from 'zod';
import type { Env } from '../env.js';
import { notFound } from '../plugins/errors.js';
import type { AppInstance } from '../types.js';
import { createSignedTicket, readCookie, readSignedTicket } from './signed-ticket.js';
import type { SessionResolver } from './session.js';

/**
 * Login de desenvolvimento — atalho para testar a aplicação sem credenciais
 * OAuth reais.
 *
 * Isto é, deliberadamente, uma porta dos fundos: qualquer pessoa que alcance a
 * rota entra como qualquer usuário. Por isso ela é protegida por uma trava que
 * não depende de ninguém lembrar de nada:
 *
 * - `assertDevOnly` LANÇA se `NODE_ENV` for `production`, e é chamada no momento
 *   do registro das rotas. O efeito é que a API se recusa a SUBIR em produção
 *   caso alguém registre isto por engano — falha barulhenta na hora, em vez de
 *   uma brecha silenciosa descoberta depois.
 * - O `app.ts` só registra estas rotas fora de produção.
 * - Há teste provando as duas coisas.
 *
 * Deixar a trava em uma variável de ambiente própria (`ENABLE_DEV_LOGIN`) seria
 * pior: uma variável a mais para alguém copiar sem querer para o ambiente errado.
 */

export const DEV_SESSION_COOKIE = 'cgsa_dev_session';

const DEV_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export class DevLoginInProductionError extends Error {
  constructor() {
    super(
      'Login de desenvolvimento não pode ser registrado com NODE_ENV=production. ' +
        'Isto é uma trava de segurança, não um erro de configuração a contornar.',
    );
    this.name = 'DevLoginInProductionError';
  }
}

export function assertDevOnly(env: Env): void {
  if (env.NODE_ENV === 'production') {
    throw new DevLoginInProductionError();
  }
}

/**
 * Resolve a identidade a partir do cookie de desenvolvimento.
 *
 * Encadeado DEPOIS do resolvedor do Better Auth: uma sessão real sempre vence,
 * então ter o login de desenvolvimento ligado não atrapalha testar o fluxo OAuth
 * de verdade quando as credenciais existirem.
 */
export function devSessionResolver(env: Env, next: SessionResolver): SessionResolver {
  assertDevOnly(env);

  return async (request) => {
    const real = await next(request);
    if (real) return real;

    return (
      readSignedTicket(
        readCookie(request.headers.cookie, DEV_SESSION_COOKIE),
        env.BETTER_AUTH_SECRET,
      ) ?? undefined
    );
  };
}

export function registerDevLoginRoutes(app: AppInstance, prisma: PrismaClient, env: Env): void {
  assertDevOnly(env);

  app.log.warn(
    'login de desenvolvimento ATIVO — qualquer pessoa com acesso a esta API entra como qualquer usuário',
  );

  const devUserSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    role: z.string(),
    profileComplete: z.boolean(),
  });

  /** Lista quem existe para escolher na tela de login de desenvolvimento. */
  app.get(
    '/dev/users',
    { schema: { response: { 200: z.array(devUserSchema) } }, config: { rateLimit: false } },
    async () =>
      prisma.user.findMany({
        select: { id: true, name: true, role: true, profileComplete: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        take: 25,
      }),
  );

  app.post(
    '/dev/login',
    {
      schema: {
        body: z.object({ userId: z.uuid() }),
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
      config: { rateLimit: false },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.body.userId },
        select: { id: true },
      });
      if (!user) throw notFound('Usuário não encontrado.');

      reply.setCookie(
        DEV_SESSION_COOKIE,
        createSignedTicket(user.id, env.BETTER_AUTH_SECRET, DEV_SESSION_TTL_MS),
        {
          httpOnly: true,
          // `secure: false` aqui é correto: desenvolvimento roda em http, e um
          // cookie `Secure` simplesmente não seria enviado. Esta rota não existe
          // em produção, então não há caso em que isso enfraqueça algo real.
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: DEV_SESSION_TTL_MS / 1000,
        },
      );

      return { ok: true as const };
    },
  );

  app.post(
    '/dev/logout',
    {
      schema: { response: { 200: z.object({ ok: z.literal(true) }) } },
      config: { rateLimit: false },
    },
    (_request, reply) => {
      reply.clearCookie(DEV_SESSION_COOKIE, { path: '/' });
      return { ok: true as const };
    },
  );
}
