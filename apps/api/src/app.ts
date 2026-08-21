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
import { registerAuthRoutes, registerLogoutRoute } from './routes/auth.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerInviteRoutes } from './modules/invite/invite.routes.js';
import { registerProfileRoutes } from './modules/profile/profile.routes.js';
import { registerShareRoutes } from './modules/share/share.routes.js';
import { registerFeedRoutes } from './modules/feed/feed.routes.js';
import { registerMediaRoutes } from './modules/media/media.routes.js';
import { registerAnnouncementRoutes } from './modules/post/announcement.routes.js';
import { registerAuthorPostsRoute, registerPostRoutes } from './modules/post/post.routes.js';
import { registerConnectionRoutes } from './modules/connection/connection.routes.js';
import { registerDirectoryRoutes } from './modules/directory/directory.routes.js';
import { registerAccountRoutes } from './modules/account/account.routes.js';
import { registerNotificationRoutes } from './modules/notification/notification.routes.js';
import { R2StorageDriver } from './modules/media/r2-storage.js';
import { LocalStorageDriver } from './modules/media/local-storage.js';
import type { StorageDriver } from './modules/media/storage.js';
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
    /*
     * Teto do CORPO de requisições JSON. O padrão do Fastify é 1 MB, e nenhuma
     * rota deste aplicativo precisa de tanto: a maior publicação tem mil
     * caracteres e o maior perfil, alguns milhares.
     *
     * Imagem NÃO passa por aqui — ela vai por multipart, que tem o próprio
     * limite em `plugins/security.ts`. Então baixar este número não afeta
     * upload, e recusa cedo um corpo grande antes de gastar memória com ele.
     */
    bodyLimit: 64 * 1024,
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
    // O Render termina o TLS e repassa o IP real no X-Forwarded-For. Sem
    // isto, o limitador de taxa veria o IP do balanceador e trataria a
    // internet inteira como um cliente só.
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);
  await registerSecurity(app, env);

  const storage = createStorage(env);
  await registerMediaHosting(app, env, storage);

  const auth = createAuth(prisma, env, app.log, storage);

  // Fora de produção, o cookie de desenvolvimento serve como identidade de
  // reserva — uma sessão real do Better Auth sempre vence. Em produção este
  // encadeamento não existe, e `registerDevLoginRoutes` se recusaria a rodar.
  const isDevelopment = env.NODE_ENV !== 'production';
  const baseResolver = resolveSession ?? betterAuthResolver(auth);
  const resolver =
    isDevelopment && !resolveSession ? devSessionResolver(env, baseResolver) : baseResolver;

  await app.register(sessionPlugin, { resolve: resolver, prisma });

  // Na raiz ficam só as rotas que não pertencem ao aplicativo:
  //   /health  — sonda de infraestrutura (o Render consulta esta URL)
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
      registerMediaRoutes(scope, prisma, storage);
      registerPostRoutes(scope, prisma, storage);
      registerAnnouncementRoutes(scope, prisma, storage);
      registerFeedRoutes(scope, prisma, storage);
      registerDirectoryRoutes(scope, prisma);
      registerConnectionRoutes(scope, prisma);
      registerNotificationRoutes(scope, prisma);
      registerAccountRoutes(scope, prisma, storage);
      registerAuthorPostsRoute(scope, prisma, storage);
      registerLogoutRoute(scope, auth);

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

/**
 * Escolhe onde as imagens ficam.
 *
 * Sem bucket configurado, cai no disco local. Isso é o que permite desenvolver
 * e rodar os testes sem credencial de nuvem nenhuma — e em produção o `env.ts`
 * **recusa a subida** se faltar qualquer uma das cinco variáveis, para este
 * recuo silencioso não acontecer lá.
 */
function createStorage(env: Env): StorageDriver {
  if (
    env.MEDIA_BUCKET &&
    env.MEDIA_PUBLIC_URL &&
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY
  ) {
    return new R2StorageDriver(
      env.MEDIA_BUCKET,
      env.MEDIA_PUBLIC_URL,
      env.R2_ACCOUNT_ID,
      env.R2_ACCESS_KEY_ID,
      env.R2_SECRET_ACCESS_KEY,
    );
  }
  return new LocalStorageDriver(env.MEDIA_LOCAL_DIR, env.API_URL);
}

/**
 * Serve as imagens do disco local em `/media/*`.
 *
 * Só existe quando não há bucket: em produção, quem serve é o Cloudflare R2
 * atrás do CDN, e a API não gasta requisição com isso.
 */
async function registerMediaHosting(
  app: FastifyInstance,
  env: Env,
  storage: StorageDriver,
): Promise<void> {
  if (!(storage instanceof LocalStorageDriver)) return;

  const [{ default: fastifyStatic }, path] = await Promise.all([
    import('@fastify/static'),
    import('node:path'),
  ]);

  await app.register(fastifyStatic, {
    root: path.resolve(env.MEDIA_LOCAL_DIR),
    prefix: '/media/',
    decorateReply: false,
    // Nomes de arquivo são UUID, então o conteúdo sob uma chave nunca muda.
    maxAge: '1y',
    immutable: true,
  });
}
