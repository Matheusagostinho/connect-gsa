import { z } from 'zod';
import { reactionSchema } from './reaction.js';

/**
 * Notificações.
 *
 * São DERIVADAS do que já está no banco — pedidos de conexão, reações e
 * comentários —, não guardadas numa tabela própria. Nesta escala, manter
 * registros duplicados custa mais do que consultá-los e abre a chance de os
 * dois lados divergirem (ASM-019).
 */
export const NOTIFICATION_KINDS = [
  'connectionRequest',
  'connectionAccepted',
  'reaction',
  'comment',
] as const;

export const notificationKindSchema = z.enum(NOTIFICATION_KINDS);

export type NotificationKind = z.infer<typeof notificationKindSchema>;

export const notificationSchema = z.object({
  /** Estável para a mesma origem — serve de chave de lista e de deduplicação. */
  id: z.string(),
  kind: notificationKindSchema,
  createdAt: z.iso.datetime(),
  /** `true` enquanto for mais recente que a última visita às notificações. */
  unread: z.boolean(),
  actor: z.object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    imageUrl: z.url().nullable(),
  }),
  /** Presente em reação e comentário: o post ao qual a notificação se refere. */
  post: z.object({ id: z.uuid(), excerpt: z.string() }).nullable(),
  /** Presente em reação: qual foi. */
  reaction: reactionSchema.nullable(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const notificationFeedSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationFeed = z.infer<typeof notificationFeedSchema>;
