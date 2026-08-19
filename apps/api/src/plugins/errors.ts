import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { ZodError } from 'zod';

/**
 * Erro esperado da aplicação: mensagem escrita para o usuário final ler.
 *
 * Qualquer outra exceção é tratada como falha nossa e vira 500 genérico — a
 * mensagem original nunca chega ao cliente.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST'): AppError =>
  new AppError(400, message, code);
export const unauthorized = (message = 'Autenticação necessária.'): AppError =>
  new AppError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'Você não tem permissão para isso.', code = 'FORBIDDEN'): AppError =>
  new AppError(403, message, code);
export const notFound = (message = 'Não encontrado.'): AppError =>
  new AppError(404, message, 'NOT_FOUND');
export const tooManyRequests = (message = 'Tentativas demais. Aguarde um pouco.'): AppError =>
  new AppError(429, message, 'TOO_MANY_REQUESTS');

/**
 * Registra o tratamento central de erros.
 *
 * A regra que sustenta o resto: em produção, nada que não seja um `AppError`
 * explícito vaza detalhe para o cliente. Stack trace, mensagem do Prisma e nome
 * de coluna são um mapa do sistema para quem está sondando.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    if (hasZodFastifySchemaValidationErrors(error) || error instanceof ZodError) {
      request.log.info({ err: error }, 'requisição rejeitada na validação');
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Os dados enviados não são válidos.',
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ code: error.code, message: error.message });
    }

    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({
        code: 'TOO_MANY_REQUESTS',
        message: 'Tentativas demais. Aguarde um pouco.',
      });
    }

    request.log.error({ err: error }, 'erro não tratado');

    return reply.status(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível concluir. Tente novamente em instantes.',
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ code: 'NOT_FOUND', message: 'Rota não encontrada.' }),
  );
}
