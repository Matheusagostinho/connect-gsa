import type { PrismaClient } from '@connect-gsa/db';
import { POST_LIMITS, myProfileSchema, uploadResultSchema } from '@connect-gsa/shared';
import type { FastifyRequest } from 'fastify';
import { requireAuth } from '../../auth/session.js';
import { badRequest } from '../../plugins/errors.js';
import type { AppInstance } from '../../types.js';
import { PROFILE_SELECT, toMyProfile } from '../profile/profile.mapper.js';
import { processImage } from './image.js';
import { buildStorageKey, type StorageDriver } from './storage.js';

/**
 * Envio de imagens.
 *
 * O arquivo passa PELA API em vez de ir direto ao bucket por URL assinada
 * (ASM-012). É mais lento, e é de propósito: só assim conseguimos inspecionar o
 * conteúdo e reprocessar a imagem — removendo o GPS do EXIF (P-001) — antes de
 * qualquer byte ser gravado. Com URL assinada, o cliente escreveria no bucket o
 * que quisesse, e a limpeza teria que acontecer depois, se acontecesse.
 */
export function registerMediaRoutes(
  app: AppInstance,
  prisma: PrismaClient,
  storage: StorageDriver,
): void {
  /** Lê o arquivo respeitando o teto — sem carregar o disco inteiro na memória. */
  async function readUpload(request: FastifyRequest): Promise<Buffer> {
    const file = await request.file({ limits: { fileSize: POST_LIMITS.imageBytesMax } });
    if (!file) throw badRequest('Nenhum arquivo enviado.', 'NO_FILE');

    const buffer = await file.toBuffer().catch(() => {
      throw badRequest('Imagem grande demais. O limite é 5 MB.', 'IMAGE_TOO_LARGE');
    });

    if (file.file.truncated) {
      throw badRequest('Imagem grande demais. O limite é 5 MB.', 'IMAGE_TOO_LARGE');
    }

    return buffer;
  }

  app.post(
    '/media/post-image',
    {
      schema: { response: { 201: uploadResultSchema } },
      config: { rateLimit: { max: 30, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      requireAuth(request);

      const processed = await processImage(await readUpload(request), {
        maxSide: POST_LIMITS.imageMaxSide,
      });

      const key = buildStorageKey('posts', processed.extension);
      await storage.save(key, processed.data, processed.contentType);

      return reply.status(201).send({ key, url: storage.urlFor(key) });
    },
  );

  app.post(
    '/media/avatar',
    {
      schema: { response: { 200: myProfileSchema } },
      config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
    },
    async (request) => {
      const user = requireAuth(request);

      const processed = await processImage(await readUpload(request), {
        maxSide: POST_LIMITS.avatarSide,
        square: true,
      });

      const key = buildStorageKey('avatars', processed.extension);
      await storage.save(key, processed.data, processed.contentType);

      const row = await prisma.user.update({
        where: { id: user.id },
        data: { image: storage.urlFor(key) },
        select: PROFILE_SELECT,
      });

      return toMyProfile(row);
    },
  );
}
