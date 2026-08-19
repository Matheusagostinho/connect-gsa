import type { PrismaClient } from '@connect-gsa/db';
import {
  myProfileSchema,
  privacyPreferencesSchema,
  publicProfileSchema,
  updateProfileSchema,
} from '@connect-gsa/shared';
import { z } from 'zod';
import type { AppInstance } from '../../types.js';
import { requireAuth } from '../../auth/session.js';
import { assertCan } from '../../authz/guard.js';
import { getMyProfile, getPublicProfile, updatePrivacy, updateProfile } from './profile.service.js';

/**
 * Rotas de perfil.
 *
 * Toda resposta declara um `response` schema. Isso não é documentação: o
 * Fastify serializa através dele, então um campo que não esteja no schema —
 * e-mail, por exemplo — simplesmente não chega ao cliente (P-002, AC-014).
 */
export function registerProfileRoutes(app: AppInstance, prisma: PrismaClient): void {
  app.get(
    '/me',
    { schema: { response: { 200: myProfileSchema } } },
    async (request) => getMyProfile(prisma, requireAuth(request).id),
  );

  app.patch(
    '/me',
    { schema: { body: updateProfileSchema, response: { 200: myProfileSchema } } },
    async (request) => {
      const user = requireAuth(request);
      // Redundante com a rota ser `/me`? Não: é a checagem que sobrevive a um
      // futuro `PATCH /profiles/:id` copiado daqui (P-004).
      assertCan(user, 'update', 'Profile', { id: user.id });
      return updateProfile(prisma, user.id, request.body);
    },
  );

  app.patch(
    '/me/privacy',
    { schema: { body: privacyPreferencesSchema, response: { 200: myProfileSchema } } },
    async (request) => {
      const user = requireAuth(request);
      assertCan(user, 'update', 'Profile', { id: user.id });
      return updatePrivacy(prisma, user.id, request.body);
    },
  );

  /**
   * Perfil de outra pessoa, por id ou por slug.
   *
   * Aceitar os dois é o que faz `/e/ana-ribeiro` funcionar sem duplicar a rota
   * — e o slug é o endereço que circula em conversa (AC-046).
   */
  app.get(
    '/profiles/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1).max(80) }),
        response: { 200: publicProfileSchema },
      },
    },
    async (request) => {
      const user = requireAuth(request);
      assertCan(user, 'read', 'Profile');
      return getPublicProfile(prisma, request.params.id, user.id);
    },
  );

  app.patch(
    '/profiles/:id',
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        body: updateProfileSchema,
        response: { 200: myProfileSchema },
      },
    },
    async (request) => {
      const user = requireAuth(request);
      // É aqui que o AC-013 vive: editar perfil alheio para em 403, no
      // servidor, independentemente do que a tela tenha permitido clicar.
      assertCan(user, 'update', 'Profile', { id: request.params.id });
      return updateProfile(prisma, request.params.id, request.body);
    },
  );
}
