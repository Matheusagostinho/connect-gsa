import type { FastifyBaseLogger, FastifyInstance, RawServerDefault } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * A instância do Fastify já ciente do provedor de tipos do Zod.
 *
 * Sem este alias, passar `app` para uma função de registro apaga o provedor e
 * `request.body` volta a ser `unknown` — o que anularia justamente a checagem
 * de tipos que o schema deveria dar de graça.
 */
export type AppInstance = FastifyInstance<
  RawServerDefault,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  ZodTypeProvider
>;
