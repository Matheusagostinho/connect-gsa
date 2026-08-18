import type { PrismaClient } from '@connect-gsa/db';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { createAuth } from './auth/better-auth.js';
import { devSessionResolver, registerDevLoginRoutes } from './auth/dev-login.js';
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

  // Fora de produção, o cookie de desenvolvimento serve como identidade de
  // reserva — uma sessão real do Better Auth sempre vence. Em produção este
  // encadeamento não existe, e `registerDevLoginRoutes` se recusaria a rodar.
  const isDevelopment = env.NODE_ENV !== 'production';
  const baseResolver = resolveSession ?? betterAuthResolver(auth);
  const resolver =
    isDevelopment && !resolveSession ? devSessionResolver(env, baseResolver) : baseResolver;

  await app.register(sessionPlugin, { resolve: resolver, prisma });

  // Na raiz ficam só as rotas que não pertencem ao aplicativo:
  //   /health  — sonda de infraestrutura (o Cloud Run consulta esta URL)
  //   /s/...   — link de compartilhamento, que vai colado em conversa
  //   /api/auth — o Better Auth, cujo `basePath` já inclui o prefixo
  registerHealthRoutes(app, version);
  registerShareRoutes(app, prisma, env);
  registerAuthRoutes(app, auth);

  // Todo o resto vive sob `/api`. Ter um prefixo único é o que permite ao SPA
  // usar um caminho relativo em desenvolvimento (com proxy do Vite) e uma URL
  // absoluta em produção, sem cada rota precisar saber qual é o caso.
  await app.register(
    (scope) => {
      registerReferenceRoutes(scope, prisma);
      registerInviteRoutes(scope, prisma, env);
      registerProfileRoutes(scope, prisma);

      if (isDevelopment) {
        registerDevLoginRoutes(scope, prisma, env);
      }

      // O registro é síncrono, mas o Fastify precisa de um sinal de conclusão:
      // sem devolver a promessa (ou chamar `done`), o `register` ficaria
      // esperando para sempre.
      return Promise.resolve();
    },
    { prefix: '/api' },
  );

  return app;
}
