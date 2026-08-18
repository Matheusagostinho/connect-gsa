import type { PrismaClient } from '@connect-gsa/db';
import { POST_LIMITS, type FeedPage, type Reaction } from '@connect-gsa/shared';
import { badRequest } from '../../plugins/errors.js';
import type { StorageDriver } from '../media/storage.js';
import { POST_SELECT, toPost, type ViewerContext } from '../post/post.mapper.js';
import { loadReactions } from '../post/post.service.js';
import { rankFeed, type RankablePost } from './ranking.js';

/**
 * Quantos posts entram na disputa por uma página.
 *
 * O ranking roda em memória, então precisa de um teto. Numa rede de algumas
 * centenas de embaixadores, 500 posts recentes cobrem semanas de atividade —
 * e quando não cobrirem mais, o sinal será um feed que "esquece" conteúdo
 * antigo, não uma queda de desempenho silenciosa.
 */
const CANDIDATE_LIMIT = 500;
const CANDIDATE_WINDOW_DAYS = 60;

interface Cursor {
  /** Instante em que o feed foi montado. Congelar isto é o que impede repetição. */
  at: string;
  offset: number;
}

/**
 * O cursor carrega o instante da montagem, não a data do último post.
 *
 * O motivo é que o feed é ORDENADO POR NOTA, não por data: um post publicado
 * entre a primeira e a segunda página se intercalaria no meio da lista e
 * empurraria os demais, fazendo você ver de novo o que já viu — ou pular o que
 * não viu (AC-039). Fixando o instante, a ordenação da página 2 é exatamente a
 * mesma que produziu a página 1.
 */
function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Cursor;
    if (typeof parsed.at !== 'string' || !Number.isInteger(parsed.offset) || parsed.offset < 0) {
      return null;
    }
    if (Number.isNaN(Date.parse(parsed.at))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function buildFeed(
  prisma: PrismaClient,
  viewer: ViewerContext,
  storage: StorageDriver,
  rawCursor: string | undefined,
): Promise<FeedPage> {
  if (rawCursor !== undefined && decodeCursor(rawCursor) === null) {
    throw badRequest('Cursor inválido.', 'INVALID_CURSOR');
  }

  const cursor = decodeCursor(rawCursor);
  const geradoEm = cursor ? new Date(cursor.at) : new Date();
  const offset = cursor?.offset ?? 0;

  const [leitor, candidatos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewer.userId },
      select: { institutionId: true, cityId: true },
    }),
    prisma.post.findMany({
      where: {
        kind: 'feed',
        // Só o que já existia quando a página 1 foi montada — post novo entra
        // na próxima visita, não no meio da rolagem.
        createdAt: {
          lte: geradoEm,
          gte: new Date(geradoEm.getTime() - CANDIDATE_WINDOW_DAYS * 86_400_000),
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: CANDIDATE_LIMIT,
      select: {
        ...POST_SELECT,
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            course: true,
            institutionId: true,
            cityId: true,
            institution: { select: { acronym: true, name: true } },
          },
        },
      },
    }),
  ]);

  const institutionIdDoLeitor = leitor?.institutionId;
  const cityIdDoLeitor = leitor?.cityId;

  const paraRanquear: RankablePost[] = candidatos.map((post) => ({
    id: post.id,
    authorId: post.authorId,
    createdAt: post.createdAt,
    reactionCounts: {},
    commentCount: post.commentCount,
    // Ids são UUID, nunca string vazia — a checagem de verdade cobre tanto o
    // leitor sem instituição quanto o autor sem instituição.
    sameInstitution: Boolean(institutionIdDoLeitor) && post.author.institutionId === institutionIdDoLeitor,
    sameCity: Boolean(cityIdDoLeitor) && post.author.cityId === cityIdDoLeitor,
  }));

  // As contagens por reação alimentam o ranking, então precisam vir antes dele.
  const { counts, mine } = await loadReactions(
    prisma,
    candidatos.map((p) => p.id),
    viewer.userId,
  );
  for (const post of paraRanquear) post.reactionCounts = counts.get(post.id) ?? {};

  const ordenados = rankFeed(paraRanquear, geradoEm);
  const pagina = ordenados.slice(offset, offset + POST_LIMITS.pageSize);

  const porId = new Map(candidatos.map((post) => [post.id, post]));

  const posts = pagina.flatMap(({ post }) => {
    const row = porId.get(post.id);
    if (!row) return [];
    const contagem: Partial<Record<Reaction, number>> = counts.get(row.id) ?? {};
    return [toPost(row, viewer, storage, contagem, mine.get(row.id) ?? null)];
  });

  const temMais = offset + POST_LIMITS.pageSize < ordenados.length;

  return {
    posts,
    nextCursor: temMais
      ? encodeCursor({ at: geradoEm.toISOString(), offset: offset + POST_LIMITS.pageSize })
      : null,
  };
}
