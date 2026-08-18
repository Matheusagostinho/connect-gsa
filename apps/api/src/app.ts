import type { PrismaClient } from '@connect-gsa/db';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createAuth } from './auth/better-auth.js';
import { betterAuthResolver, sessionPlugin, type SessionResolver } from './auth/session.js';
import type { Env } from './env.js';
import { registerErrorHandler } from './plugins/errors.js';
import { registerSecurity } from './plugins/security.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerInviteRoutes } from './modules/invite/invite.routes.js';
import { registerProfileRoutes } from './modules/profile/profile.routes.js';
import { registerShareRoutes } from './modules/share/share.routes.js';
import { registerReferenceRoutes } from './routes/reference.js';

export interface AppDeps {
  env: Env;
  prisma: PrismaClient;
  version?: string;
  /** Só os testes passam isto; em produção a identidade vem do Better Auth. */
  resolveSession?: SessionResolver;
}

/**
 * Monta a aplicação sem abrir porta nenhuma.
 *
 * Separar a montagem da escuta é o que permite aos testes usarem
 * `app.inject()`: as rotas rodam de verdade, com validação, autorização e
 * tratamento de erro reais, sem socket e sem porta disputada entre arquivos.
 */
export async function buildApp({
  env,
  prisma,
  version = '0.1.0',
  resolveSession,
}: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
      // P-005: mesmo em log de erro, estes caminhos saem como [Redacted]. Um
      // log de requisição de rota de auth carregaria cookie de sessão e código
      // de convite direto para o Cloud Logging.
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'res.headers["set-cookie"]',
          'req.body.code',
          '*.email',
          '*.token',
          '*.password',
        ],
        censor: '[Redacted]',
      },
    },
    // O Cloud Run termina o TLS e repassa o IP real no X-Forwarded-For. Sem
    // isto, o limitador de taxa veria o IP do balanceador e trataria a
    // internet inteira como um cliente só.
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);
  await registerSecurity(app, env);

  const auth = createAuth(prisma, env);
  await app.register(sessionPlugin, { resolve: resolveSession ?? betterAuthResolver(auth), prisma });

  registerHealthRoutes(app, version);
  registerAuthRoutes(app, auth);
  registerReferenceRoutes(app, prisma);
  registerInviteRoutes(app, prisma, env);
  registerProfileRoutes(app, prisma);
  registerShareRoutes(app, prisma, env);

  return app;
}
