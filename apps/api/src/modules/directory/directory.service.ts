import type { PrismaClient } from '@connect-gsa/db';
import type { AmbassadorCard, DirectoryPage, DirectoryQuery, MapCity } from '@connect-gsa/shared';
import { badRequest } from '../../plugins/errors.js';
import { connectionStatesFor } from '../connection/connection.service.js';

const PAGE_SIZE = 24;

/** O que uma pessoa expõe numa lista. Note a ausência de e-mail (P-002). */
const CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  image: true,
  course: true,
  institution: { select: { name: true, campus: true, acronym: true } },
  city: { select: { name: true, state: true } },
  skills: { select: { slug: true, name: true, category: true } },
} as const;

interface CardRow {
  id: string;
  slug: string | null;
  name: string;
  image: string | null;
  course: string | null;
  institution: { name: string; campus: string; acronym: string | null } | null;
  city: { name: string; state: string } | null;
  skills: { slug: string; name: string; category: string }[];
}

function institutionLabel(i: CardRow['institution']): string | null {
  if (!i) return null;
  const base = i.acronym ?? i.name;
  return i.campus ? `${base} — ${i.campus}` : base;
}

export function toCard(row: CardRow, connection: AmbassadorCard['connection']): AmbassadorCard {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.name,
    imageUrl: row.image,
    course: row.course ?? '',
    institution: institutionLabel(row.institution),
    city: row.city ? `${row.city.name}/${row.city.state}` : null,
    skills: row.skills,
    connection,
  };
}

/** Converte várias linhas em cartões, resolvendo o estado de conexão em lote. */
export async function toCards(
  prisma: PrismaClient,
  viewerId: string,
  rows: readonly CardRow[],
): Promise<AmbassadorCard[]> {
  const estados = await connectionStatesFor(
    prisma,
    viewerId,
    rows.map((r) => r.id),
  );
  return rows.map((row) => toCard(row, estados.get(row.id) ?? 'none'));
}

/**
 * Busca no diretório.
 *
 * O cursor é `nome|id` do último resultado, e a ordenação é por nome — estável
 * e independente de engajamento, ao contrário do feed. Uma pessoa entrando na
 * rede no meio da rolagem pode aparecer numa página seguinte, o que é o
 * comportamento correto aqui: o diretório é uma lista viva, não um instantâneo.
 */
export async function searchDirectory(
  prisma: PrismaClient,
  viewerId: string,
  query: DirectoryQuery,
): Promise<DirectoryPage> {
  const cursor = decodeCursor(query.cursor);
  if (query.cursor !== undefined && !cursor) throw badRequest('Cursor inválido.', 'INVALID_CURSOR');

  const termo = query.q?.trim();

  const rows = await prisma.user.findMany({
    where: {
      // Perfil incompleto não aparece para ninguém — a pessoa ainda não se
      // apresentou, e um cartão sem instituição nem cidade não ajuda quem busca.
      profileComplete: true,
      ...(query.institutionId ? { institutionId: query.institutionId } : {}),
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.skill ? { skills: { some: { slug: query.skill } } } : {}),
      ...(termo
        ? {
            OR: [
              { name: { contains: termo, mode: 'insensitive' as const } },
              { course: { contains: termo, mode: 'insensitive' as const } },
              { institution: { name: { contains: termo, mode: 'insensitive' as const } } },
              { institution: { acronym: { contains: termo, mode: 'insensitive' as const } } },
              { institution: { campus: { contains: termo, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(cursor
        ? {
            OR: [
              { name: { gt: cursor.name } },
              { name: cursor.name, id: { gt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: PAGE_SIZE + 1,
    select: CARD_SELECT,
  });

  const temMais = rows.length > PAGE_SIZE;
  const pagina = temMais ? rows.slice(0, PAGE_SIZE) : rows;
  const ultimo = pagina.at(-1);

  return {
    people: await toCards(prisma, viewerId, pagina),
    nextCursor: temMais && ultimo ? encodeCursor({ name: ultimo.name, id: ultimo.id }) : null,
  };
}

interface Cursor {
  name: string;
  id: string;
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Cursor;
    return typeof parsed.name === 'string' && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * O mapa, agrupado por CIDADE.
 *
 * A agregação não é otimização: é a garantia de privacidade (P-001, AC-054).
 * A resposta não tem como carregar posição de uma pessoa porque a coordenada
 * devolvida é a do município, e é a mesma para todo mundo que está nele.
 *
 * Só entra quem ligou a visibilidade no mapa (AC-053) e concluiu o perfil.
 */
export async function buildMap(prisma: PrismaClient): Promise<MapCity[]> {
  const pessoas = await prisma.user.findMany({
    where: { profileComplete: true, visibleOnMap: true, cityId: { not: null } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      image: true,
      city: { select: { id: true, name: true, state: true, latitude: true, longitude: true } },
    },
  });

  const porCidade = new Map<string, MapCity>();

  for (const pessoa of pessoas) {
    const city = pessoa.city;
    if (!city) continue;

    const atual = porCidade.get(city.id) ?? {
      cityId: city.id,
      city: city.name,
      state: city.state,
      latitude: city.latitude,
      longitude: city.longitude,
      count: 0,
      preview: [],
    };

    atual.count += 1;
    // Três fotos bastam para o pino; a lista completa vem ao clicar (AC-052).
    if (atual.preview.length < 3) {
      atual.preview.push({
        id: pessoa.id,
        slug: pessoa.slug ?? pessoa.id,
        name: pessoa.name,
        imageUrl: pessoa.image,
      });
    }

    porCidade.set(city.id, atual);
  }

  return [...porCidade.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

/** Quem está numa cidade — o que abre ao clicar num ponto do mapa. */
export async function peopleInCity(
  prisma: PrismaClient,
  viewerId: string,
  cityId: string,
): Promise<AmbassadorCard[]> {
  const rows = await prisma.user.findMany({
    where: { cityId, profileComplete: true, visibleOnMap: true },
    orderBy: { name: 'asc' },
    take: 100,
    select: CARD_SELECT,
  });

  return toCards(prisma, viewerId, rows);
}
