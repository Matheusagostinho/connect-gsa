import type { PrismaClient } from '@connect-gsa/db';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { Env } from '../env.js';
import {
  attachInviteToUser,
  resolveInviteByHash,
  isEmailAllowed,
} from '../modules/invite/invite.service.js';
import { INVITE_COOKIE, readCookie, readInviteTicket } from './invite-ticket.js';

const ACESSO_RESTRITO =
  'O ConnectGSA é exclusivo para participantes do Programa de Embaixadores Estudantis do Google. ' +
  'Use um convite válido ou entre com o e-mail cadastrado no programa.';

/** Convite reservado durante a criação da conta, para ser vinculado logo depois. */
const pendingInvites = new Map<string, string>();

export type Auth = ReturnType<typeof createAuth>;

/**
 * As opções do Better Auth, separadas da instância.
 *
 * Os testes montam a própria instância a partir daqui, acrescentando o plugin
 * `testUtils`. Se o plugin fosse aceito como parâmetro desta função, seu tipo
 * seria apagado e `ctx.test` deixaria de existir para o TypeScript — a própria
 * documentação do Better Auth avisa sobre isso e recomenda instância separada.
 *
 * O que importa é que a configuração de segurança abaixo — o portão, o vínculo
 * de contas, os atributos do cookie — é EXATAMENTE a mesma nos dois casos.
 */
export function buildAuthOptions(prisma: PrismaClient, env: Env) {
  const isProduction = env.NODE_ENV === 'production';

  return {
    baseURL: env.API_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.WEB_ORIGINS,

    database: prismaAdapter(prisma, { provider: 'postgresql' }),

    // Sem senha própria: nada de hash para vazar, nada de fluxo de recuperação
    // para atacar. Toda entrada passa por um provedor social.
    emailAndPassword: { enabled: false },

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
      linkedin: {
        clientId: env.LINKEDIN_CLIENT_ID,
        clientSecret: env.LINKEDIN_CLIENT_SECRET,
      },
    },

    account: {
      accountLinking: {
        // Vincular provedores pelo e-mail só é seguro porque o Better Auth
        // exige que o provedor tenha VERIFICADO o e-mail antes de considerá-lo
        // confiável (ASM-006). Sem essa exigência, bastaria criar uma conta num
        // provedor qualquer com o e-mail da vítima para assumir o perfil dela.
        enabled: true,
        trustedProviders: ['google', 'github', 'linkedin'],
      },
    },

    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'ambassador', input: false },
        profileComplete: { type: 'boolean', required: false, defaultValue: false, input: false },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },

    /**
     * Para onde vai quem tropeça no meio do login.
     *
     * Sem isto, o Better Auth manda para `${baseURL}/error` — que é o domínio da
     * API. A pessoa recusada saía do Google e caía numa página JSON dizendo
     * "Rota não encontrada", no endereço errado, sem explicação e sem caminho de
     * volta. Numa rede FECHADA isso não é caso raro: recusar é o comportamento
     * normal para quem não tem convite.
     *
     * O SPA lê o `?error=` e traduz. Vale saber o que os códigos querem dizer,
     * porque eles não são intuitivos:
     *
     * - `internal_server_error` — uma consulta ao BANCO falhou. É o que o
     *   `link-account` emite quando o adapter lança, e em produção quase sempre
     *   significa migração pendente: o client do Prisma pede colunas que a
     *   tabela ainda não tem.
     * - as recusas do portão NÃO passam por aqui — `APIError` é relançada.
     */
    onAPIError: {
      errorURL: `${env.WEB_URL.replace(/\/+$/, '')}/entrar`,
    },

    advanced: {
      /**
       * O id de usuário, sessão e conta é UUID — não o gerador do Better Auth.
       *
       * O padrão da biblioteca é uma string curta no estilo nanoid, e ela NÃO é
       * um UUID. Todo schema de saída deste projeto declara `z.uuid()`, e o
       * Fastify valida a resposta contra ele: com o id do padrão, `/me` respondia
       * **400 com "Invalid UUID"** logo depois de um login bem-sucedido.
       *
       * Não apareceu em desenvolvimento porque lá as pessoas vêm do seed, que
       * usa o `@default(uuid())` do Prisma. Só quem entra pelo OAuth recebe um id
       * gerado pela biblioteca — e isso é exatamente o caminho que a tela `/dev`
       * contorna.
       *
       * A correção certa é alinhar o gerador, e não afrouxar `z.uuid()` nos
       * vinte schemas que o usam: a validação de saída é o que impede a API de
       * devolver campo que não deveria (P-002), e enfraquecê-la para acomodar um
       * formato de id seria pagar em segurança por um detalhe de biblioteca.
       */
      database: { generateId: 'uuid' },

      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        // `none` exige `secure`, senão o navegador descarta o cookie em
        // silêncio. Em produção `isProduction` já garante; fora dela, `none`
        // não é usado.
        secure: isProduction || env.COOKIE_SAME_SITE === 'none',
        sameSite: env.COOKIE_SAME_SITE,
        path: '/',
      },
    },

    databaseHooks: {
      user: {
        create: {
          /**
           * O portão da rede (AC-004).
           *
           * Autenticar no Google prova quem a pessoa é, não que ela pertence ao
           * programa. Este hook roda antes de qualquer linha ser gravada: se
           * não houver convite reservável nem e-mail pré-aprovado, a exceção
           * aborta a criação e o banco continua sem registro nenhum.
           */
          before: async (user, ctx) => {
            const email = String(user.email ?? '').toLowerCase();

            if (await isEmailAllowed(prisma, email)) {
              return { data: user };
            }

            const cookieHeader = ctx?.headers?.get('cookie');
            const codeHash = readInviteTicket(
              readCookie(cookieHeader, INVITE_COOKIE),
              env.BETTER_AUTH_SECRET,
            );

            if (!codeHash) {
              throw new APIError('FORBIDDEN', { message: ACESSO_RESTRITO });
            }

            try {
              // Confere o prazo. Não reserva: o convite vale para quantas
              // pessoas receberem o link (P-009, emendado em 2026-08-20).
              const { inviteId } = await resolveInviteByHash(prisma, codeHash);
              pendingInvites.set(email, inviteId);
            } catch {
              throw new APIError('FORBIDDEN', { message: ACESSO_RESTRITO });
            }

            return { data: user };
          },

          after: async (user) => {
            const email = String(user.email ?? '').toLowerCase();
            const inviteId = pendingInvites.get(email);
            if (!inviteId) return;

            pendingInvites.delete(email);
            await attachInviteToUser(prisma, inviteId, user.id);
          },
        },
      },
    },
  } satisfies BetterAuthOptions;
}

export function createAuth(prisma: PrismaClient, env: Env) {
  return betterAuth(buildAuthOptions(prisma, env));
}

export { ACESSO_RESTRITO };
