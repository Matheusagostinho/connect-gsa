import type { Post, Reaction } from '@connect-gsa/shared';
import type { StorageDriver } from '../media/storage.js';

/** Tudo o que o serviço precisa buscar para montar um post. */
export const POST_SELECT = {
  id: true,
  content: true,
  mediaKey: true,
  createdAt: true,
  commentCount: true,
  authorId: true,
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      course: true,
      institution: { select: { acronym: true, name: true } },
    },
  },
} as const;

export interface PostRow {
  id: string;
  content: string;
  mediaKey: string | null;
  createdAt: Date;
  commentCount: number;
  authorId: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    course: string | null;
    institution: { acronym: string | null; name: string } | null;
  };
}

export interface ViewerContext {
  userId: string;
  isModerator: boolean;
}

/**
 * Única porta de saída de um post (P-002).
 *
 * O autor sai pelo `postAuthorSchema`, que não tem campo de e-mail — então
 * vazar contato por aqui exigiria mudar o contrato compartilhado, não apenas
 * esquecer um `select`.
 *
 * `canDelete` é resolvido no servidor e mandado pronto: a tela usa isso para
 * decidir se mostra o botão, mas quem recusa a exclusão de verdade é a rota.
 */
export function toPost(
  row: PostRow,
  viewer: ViewerContext,
  storage: StorageDriver,
  reactionCounts: Partial<Record<Reaction, number>>,
  myReaction: Reaction | null,
): Post {
  return {
    id: row.id,
    content: row.content,
    mediaUrl: row.mediaKey ? storage.urlFor(row.mediaKey) : null,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      name: row.author.name,
      imageUrl: row.author.image,
      course: row.author.course,
      institutionAcronym: row.author.institution?.acronym ?? row.author.institution?.name ?? null,
    },
    reactionCounts,
    myReaction,
    commentCount: row.commentCount,
    canDelete: row.authorId === viewer.userId || viewer.isModerator,
  };
}
