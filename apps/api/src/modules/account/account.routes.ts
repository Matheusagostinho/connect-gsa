import type { PrismaClient } from '@connect-gsa/db';
import { accountExportSchema, deleteAccountSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { DEV_SESSION_COOKIE } from '../../auth/dev-login.js';
import { requireAuth } from '../../auth/session.js';
import type { AppInstance } from '../../types.js';
import type { StorageDriver } from '../media/storage.js';
import { deleteAccount, exportAccount } from './account.service.js';

export function registerAccountRoutes(
  app: AppInstance,
  prisma: PrismaClient,
  storage: StorageDriver,
): void {
  app.get(
    '/me/export',
    {
      schema: { response: { 200: accountExportSchema } },
      // Exportar é caro e ninguém precisa fazer isso a cada minuto.
      config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const dados = await exportAccount(prisma, requireAuth(request).id, storage);

      // Faz o navegador baixar em vez de exibir — a pessoa pediu os dados, não
      // uma tela cheia de JSON.
      const nome = `connectgsa-meus-dados-${dados.exportedAt.slice(0, 10)}.json`;
      reply.header('content-disposition', `attachment; filename="${nome}"`);

      return dados;
    },
  );

  app.delete(
    '/me',
    {
      schema: { body: deleteAccountSchema, response: { 200: z.object({ ok: z.literal(true) }) } },
      config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const user = requireAuth(request);

      await deleteAccount(prisma, user.id, storage);

      // A sessão morre junto: sem isso, o cookie continuaria apontando para um
      // usuário que não existe mais (AC-077).
      reply.clearCookie(DEV_SESSION_COOKIE, { path: '/' });

      // Só o identificador, nunca o e-mail (P-005). Exclusão é um evento que
      // vale registrar — mas registrar quem era contraria o que a pessoa pediu.
      request.log.info({ userId: user.id }, 'conta excluída a pedido do titular');

      return { ok: true as const };
    },
  );
}
