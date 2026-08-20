import type { PrismaClient } from '@connect-gsa/db';
import type { AccountExport } from '@connect-gsa/shared';
import { notFound } from '../../plugins/errors.js';
import type { StorageDriver } from '../media/storage.js';

/**
 * Direitos do titular sobre os próprios dados (LGPD art. 18, V e VI).
 */

/**
 * Exporta tudo o que a rede sabe sobre uma pessoa.
 *
 * Inclui o e-mail dela — é dado dela, e portabilidade sem o identificador
 * principal seria portabilidade pela metade. O que fica de fora é dado de
 * terceiros: quem comentou numa publicação sua aparece pelo NOME, nunca pelo
 * contato (AC-071, P-002).
 */
export async function exportAccount(
  prisma: PrismaClient,
  userId: string,
  storage: StorageDriver,
): Promise<AccountExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      image: true,
      role: true,
      course: true,
      bio: true,
      links: true,
      visibleOnMap: true,
      createdAt: true,
      skills: { select: { name: true } },
      institution: { select: { name: true, campus: true } },
      city: { select: { name: true, state: true } },
      invitedBy: { select: { name: true } },
      invited: { select: { name: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!user) throw notFound('Conta não encontrada.');

  const [posts, comments, reactions, connections] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        mediaKey: true,
        createdAt: true,
        reactionCount: true,
        commentCount: true,
      },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        post: { select: { author: { select: { name: true } } } },
      },
    }),
    prisma.postReaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { postId: true, kind: true, createdAt: true },
    }),
    prisma.connection.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: {
        status: true,
        createdAt: true,
        userAId: true,
        userA: { select: { name: true } },
        userB: { select: { name: true } },
      },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    format: 1,
    profile: {
      id: user.id,
      slug: user.slug,
      name: user.name,
      email: user.email,
      imageUrl: user.image,
      role: user.role,
      course: user.course,
      bio: user.bio,
      skills: user.skills.map((s) => s.name),
      links: user.links,
      institution: user.institution
        ? [user.institution.name, user.institution.campus].filter(Boolean).join(' — ')
        : null,
      city: user.city ? `${user.city.name}/${user.city.state}` : null,
      visibleOnMap: user.visibleOnMap,
      createdAt: user.createdAt.toISOString(),
    },
    referral: {
      invitedBy: user.invitedBy?.name ?? null,
      invited: user.invited.map((pessoa) => ({
        name: pessoa.name,
        joinedAt: pessoa.createdAt.toISOString(),
      })),
    },
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.mediaKey ? storage.urlFor(p.mediaKey) : null,
      createdAt: p.createdAt.toISOString(),
      reactionsReceived: p.reactionCount,
      commentsReceived: p.commentCount,
    })),
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      onPostBy: c.post.author.name,
    })),
    reactions: reactions.map((r) => ({
      postId: r.postId,
      reaction: r.kind,
      createdAt: r.createdAt.toISOString(),
    })),
    connections: connections.map((c) => ({
      name: c.userAId === userId ? c.userB.name : c.userA.name,
      status: c.status,
      since: c.createdAt.toISOString(),
    })),
  };
}

/**
 * Apaga a conta e tudo o que ela produziu.
 *
 * Três coisas que a cascata do banco NÃO faz sozinha, e cada uma delas viraria
 * um defeito silencioso:
 *
 * 1. **Os contadores de terceiros.** `reactionCount` e `commentCount` são
 *    desnormalizados. Ao apagar esta pessoa, as reações e comentários dela nos
 *    posts DE OUTRAS somem em cascata — e os contadores daqueles posts ficariam
 *    mentindo para sempre, sem ninguém perceber. Por isso são acertados ANTES.
 * 2. **As imagens.** Foto de perfil e imagens de post vivem no armazenamento.
 *    Apagar só as linhas deixaria os arquivos acessíveis por URL, indefinidamente.
 * 3. **A ordem.** Acertar contador depois da cascata seria acertar o quê? As
 *    linhas que diriam quanto descontar já não existiriam.
 */
export async function deleteAccount(
  prisma: PrismaClient,
  userId: string,
  storage: StorageDriver,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, image: true },
  });

  if (!user) throw notFound('Conta não encontrada.');

  // As chaves das imagens precisam ser lidas antes: depois da exclusão não há
  // mais de onde tirá-las.
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    select: { id: true, mediaKey: true },
  });

  const [reacoesEmOutros, comentariosEmOutros] = await Promise.all([
    prisma.postReaction.findMany({
      where: { userId, post: { authorId: { not: userId } } },
      select: { postId: true },
    }),
    prisma.comment.findMany({
      where: { authorId: userId, post: { authorId: { not: userId } } },
      select: { postId: true },
    }),
  ]);

  /** Quantas interações minhas cada post de terceiro recebeu. */
  const contar = (linhas: { postId: string }[]): Map<string, number> => {
    const mapa = new Map<string, number>();
    for (const { postId } of linhas) mapa.set(postId, (mapa.get(postId) ?? 0) + 1);
    return mapa;
  };

  const reacoesPorPost = contar(reacoesEmOutros);
  const comentariosPorPost = contar(comentariosEmOutros);

  await prisma.$transaction([
    ...[...reacoesPorPost].map(([postId, quantas]) =>
      prisma.post.update({
        where: { id: postId },
        data: { reactionCount: { decrement: quantas } },
      }),
    ),
    ...[...comentariosPorPost].map(([postId, quantos]) =>
      prisma.post.update({
        where: { id: postId },
        data: { commentCount: { decrement: quantos } },
      }),
    ),
    // A cascata do banco cuida de posts, reações, comentários, sessões, contas
    // e conexões — todos declarados com `onDelete: Cascade`.
    prisma.user.delete({ where: { id: userId } }),
  ]);

  // Depois de o banco confirmar. Falhar aqui deixa arquivo órfão, que é ruim —
  // mas apagar arquivo antes e a transação falhar deixaria post sem imagem,
  // que é pior: um dá desperdício, o outro dá dado corrompido.
  const chaves = [
    ...posts.flatMap((p) => (p.mediaKey ? [p.mediaKey] : [])),
    ...extrairChaveDeAvatar(user.image),
  ];

  await Promise.all(chaves.map((chave) => storage.remove(chave).catch(() => undefined)));
}

/**
 * Recupera a chave do avatar a partir da URL guardada.
 *
 * A foto de perfil guarda a URL completa (veio do provedor OAuth ou do nosso
 * armazenamento), não a chave. Só apagamos o que é nosso: uma URL do Google não
 * é arquivo que nos pertença remover.
 */
function extrairChaveDeAvatar(image: string | null): string[] {
  if (!image) return [];

  const marca = '/avatars/';
  const indice = image.indexOf(marca);
  if (indice === -1) return [];

  return [`avatars/${image.slice(indice + marca.length)}`];
}
