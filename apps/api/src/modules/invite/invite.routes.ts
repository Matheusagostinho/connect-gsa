import type { PrismaClient } from '@connect-gsa/db';
import {
  createInviteSchema,
  createdInviteSchema,
  inviteCodeSchema,
  inviteInvitationSchema,
  redeemInviteSchema,
} from '@connect-gsa/shared';
import { z } from 'zod';
import type { AppInstance } from '../../types.js';
import {
  INVITE_COOKIE,
  INVITE_TICKET_TTL_MS,
  createInviteTicket,
} from '../../auth/invite-ticket.js';
import { requireAuth } from '../../auth/session.js';
import { assertCan } from '../../authz/guard.js';
import type { Env } from '../../env.js';
import { checkInvite, createInvite, invitationFor } from './invite.service.js';

export function registerInviteRoutes(app: AppInstance, prisma: PrismaClient, env: Env): void {
  app.post(
    '/invites',
    { schema: { body: createInviteSchema, response: { 201: createdInviteSchema } } },
    async (request, reply) => {
      const user = requireAuth(request);
      assertCan(user, 'create', 'Invite');

      const invite = await createInvite(prisma, user.id, request.body, env.WEB_URL, user.role);
      return reply.status(201).send(invite);
    },
  );

  /**
   * Quem convidou, para a página do convite.
   *
   * Mesmo limite apertado do `/invites/check`, e pelo mesmo motivo: ela também
   * responde diferente para um código que existe e um que não existe. Sem o
   * limite, seria o oráculo de uma varredura.
   */
  app.get(
    '/invites/:code',
    {
      schema: {
        params: z.object({ code: inviteCodeSchema }),
        response: { 200: inviteInvitationSchema },
      },
      config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
    },
    async (request) => invitationFor(prisma, request.params.code),
  );

  /**
   * Valida o convite e emite o bilhete que sobrevive ao login social.
   *
   * O limite é o mais apertado da API, e por um motivo específico (AC-008):
   * esta é a única rota pública que responde de forma diferente para um código
   * que existe e um que não existe. Sem o limite, ela seria o oráculo de uma
   * varredura — com ele, tentar adivinhar 128 bits a 10 chutes por minuto
   * deixa de ser um ataque e vira uma piada.
   */
  app.post(
    '/invites/check',
    {
      schema: {
        body: redeemInviteSchema,
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
      config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const { codeHash } = await checkInvite(prisma, request.body.code);

      // httpOnly: o SPA não lê nem precisa ler. O bilhete existe só para
      // atravessar o redirecionamento até o provedor e voltar.
      reply.setCookie(INVITE_COOKIE, createInviteTicket(codeHash, env.BETTER_AUTH_SECRET), {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: INVITE_TICKET_TTL_MS / 1000,
      });

      return { ok: true as const };
    },
  );
}
