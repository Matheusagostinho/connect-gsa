import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import type { Env } from '../env.js';

/**
 * Camada de segurança que vale para toda a API.
 *
 * Limites específicos e mais apertados (resgate de convite, por exemplo) são
 * declarados na própria rota — este é o piso, não o teto.
 */
export async function registerSecurity(app: FastifyInstance, env: Env): Promise<void> {
  // A API responde JSON e nunca serve HTML de aplicação; a única exceção é a
  // rota de prévia de link, que declara a própria política.
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  // Lista explícita de origens. `credentials: true` é obrigatório porque a
  // sessão viaja em cookie (P-008) — e é justamente por isso que curinga de
  // origem não é uma opção aqui.
  await app.register(cors, {
    origin: env.WEB_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    maxAge: 86_400,
  });

  await app.register(cookie, {
    secret: env.BETTER_AUTH_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  });

  // O teto de tamanho é aplicado no plugin, antes de o corpo ser lido inteiro:
  // recusar 50 MB depois de recebê-los seria pagar a banda à toa.
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4 },
  });

  // Piso global. O diretório de embaixadores é uma lista de contatos valiosa:
  // sem limite, uma única sessão autenticada raspa a rede inteira (P-002).
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // Chaveia pelo usuário quando há sessão; por IP quando não há. Sem isso,
    // uma rede universitária inteira atrás de um NAT compartilharia o limite.
    keyGenerator: (request) => request.session?.userId ?? request.ip,
  });
}
