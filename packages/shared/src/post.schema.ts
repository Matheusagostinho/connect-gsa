import { z } from 'zod';
import { reactionSchema } from './reaction.js';

export const POST_LIMITS = {
  contentMax: 1000,
  commentMax: 500,
  /** 5 MB: cabe uma foto de celular e não estoura a cota gratuita de armazenamento. */
  imageBytesMax: 5 * 1024 * 1024,
  /** Maior lado da imagem depois do reprocessamento. */
  imageMaxSide: 1200,
  avatarSide: 320,
  pageSize: 20,
} as const;

/**
 * As duas leituras do feed.
 *
 * `forYou` ORDENA por afinidade, não filtra: um filtro rígido deixaria a tela
 * inicial de quem acabou de chegar vazia — e quem chega agora é justamente quem
 * mais precisa ver a rede. `following` filtra de verdade, para conexões.
 */
export const feedTabSchema = z.enum(['forYou', 'following']);

export type FeedTab = z.infer<typeof feedTabSchema>;

/** Publicação comum ou comunicado oficial do programa. */
export const postKindSchema = z.enum(['feed', 'announcement']);

export type PostKind = z.infer<typeof postKindSchema>;

export const createAnnouncementSchema = z.object({
  content: z.string().trim().min(1, 'Escreva o comunicado').max(POST_LIMITS.contentMax),
  mediaKey: z.string().trim().max(200).optional(),
});

export type CreateAnnouncement = z.infer<typeof createAnnouncementSchema>;

export const createPostSchema = z.object({
  content: z.string().trim().min(1, 'Escreva alguma coisa').max(POST_LIMITS.contentMax),
  /** Chave devolvida pelo envio de imagem; o cliente nunca escolhe a URL final. */
  mediaKey: z.string().trim().max(200).optional(),
});

export type CreatePost = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Escreva alguma coisa').max(POST_LIMITS.commentMax),
});

export type CreateComment = z.infer<typeof createCommentSchema>;

export const reactToPostSchema = z.object({
  reaction: reactionSchema,
});

/** Autor resumido — o mesmo formato em post e comentário. E sem e-mail (P-002). */
export const postAuthorSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  imageUrl: z.url().nullable(),
  course: z.string().nullable(),
  institutionAcronym: z.string().nullable(),
  /** Relação de quem lê com quem publicou — é o que decide se cabe convidar. */
  connection: z.enum(['none', 'pendingSent', 'pendingReceived', 'connected', 'self']),
});

export const commentSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  createdAt: z.iso.datetime(),
  author: postAuthorSchema,
  /** É meu — posso apagar. */
  canDelete: z.boolean(),
  /**
   * Não é meu, mas tenho poder de moderação.
   *
   * Separado de `canDelete` de propósito: apagar o que é seu e remover o que é
   * de outra pessoa são atos diferentes, e mostrá-los com o mesmo botão faz a
   * coordenação achar que está apagando o próprio conteúdo.
   */
  canModerate: z.boolean(),
});

export type Comment = z.infer<typeof commentSchema>;

export const postSchema = z.object({
  id: z.uuid(),
  /** Distingue publicação comum de comunicado oficial. */
  kind: postKindSchema,
  content: z.string(),
  mediaUrl: z.url().nullable(),
  createdAt: z.iso.datetime(),
  author: postAuthorSchema,
  /**
   * Quantas pessoas escolheram cada reação. Só aparecem as com contagem maior
   * que zero — daí ser parcial: mandar cinco zeros em todo post é peso morto
   * numa rede que paga transferência por megabyte.
   */
  reactionCounts: z.partialRecord(reactionSchema, z.number().int().nonnegative()),
  /** A reação de quem está lendo, ou `null`. É o que deixa o botão aceso. */
  myReaction: reactionSchema.nullable(),
  commentCount: z.number().int().nonnegative(),
  /** É meu — posso apagar. */
  canDelete: z.boolean(),
  /** Não é meu, mas tenho poder de moderação. */
  canModerate: z.boolean(),
});

export type Post = z.infer<typeof postSchema>;

export const feedPageSchema = z.object({
  posts: z.array(postSchema),
  /** Passe de volta em `?cursor=` para pedir a próxima página. `null` no fim. */
  nextCursor: z.string().nullable(),
});

export type FeedPage = z.infer<typeof feedPageSchema>;

export const uploadResultSchema = z.object({
  key: z.string(),
  url: z.url(),
});

export type UploadResult = z.infer<typeof uploadResultSchema>;
