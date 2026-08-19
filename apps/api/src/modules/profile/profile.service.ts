import type { PrismaClient } from '@connect-gsa/db';
import type {
  MyProfile,
  PrivacyPreferences,
  PublicProfile,
  UpdateProfile,
} from '@connect-gsa/shared';
import { notFound } from '../../plugins/errors.js';
import { connectionStateFor } from '../connection/connection.service.js';
import { badRequest } from '../../plugins/errors.js';
import { PROFILE_SELECT, toMyProfile, toPublicProfile } from './profile.mapper.js';
import { sanitizeText } from './sanitize.js';
import { buildUniqueSlug } from './slug.js';

/**
 * Busca o perfil de outra pessoa pelo id OU pelo slug.
 *
 * Aceitar os dois deixa `/e/ana-ribeiro` e a navegação interna por id usarem a
 * mesma rota — sem duplicar a regra de "só perfil concluído aparece".
 */
export async function getPublicProfile(
  prisma: PrismaClient,
  idOuSlug: string,
  viewerId?: string,
): Promise<PublicProfile> {
  const row = await prisma.user.findFirst({
    where: {
      profileComplete: true,
      OR: [{ slug: idOuSlug }, ...(isUuid(idOuSlug) ? [{ id: idOuSlug }] : [])],
    },
    select: PROFILE_SELECT,
  });

  if (!row) throw notFound('Perfil não encontrado.');

  const connection = viewerId ? await connectionStateFor(prisma, viewerId, row.id) : 'none';

  return toPublicProfile(row, connection);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (valor: string): boolean => UUID.test(valor);

export async function getMyProfile(prisma: PrismaClient, userId: string): Promise<MyProfile> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  if (!row) throw notFound('Perfil não encontrado.');
  return toMyProfile(row);
}

/**
 * Grava o perfil do próprio usuário.
 *
 * Dois cuidados que não são detalhe:
 *
 * - Texto livre é sanitizado AQUI, na entrada (P-006). O que chega ao Postgres
 *   já está inerte.
 * - A cidade é validada contra a tabela `City`. Aceitar um id qualquer deixaria
 *   o cliente escolher a coordenada que aparece no mapa — e a garantia do P-001
 *   deixaria de valer, porque a posição passaria a vir do cliente.
 */
export async function updateProfile(
  prisma: PrismaClient,
  userId: string,
  input: UpdateProfile,
): Promise<MyProfile> {
  const [city, institution] = await Promise.all([
    prisma.city.findUnique({ where: { id: input.cityId }, select: { id: true } }),
    prisma.institution.findUnique({ where: { id: input.institutionId }, select: { id: true } }),
  ]);

  if (!city) throw notFound('Cidade não encontrada.');
  if (!institution) throw notFound('Instituição não encontrada.');

  const links = input.links.map((link) => ({
    label: sanitizeText(link.label),
    // A URL não é sanitizada como texto — o schema já exige https e limita o
    // tamanho. Passá-la pelo sanitizador de HTML só a corromperia.
    url: link.url,
  }));

  // Habilidade fora do catálogo é recusada em vez de criada (AC-045): aceitar
  // texto livre aqui reabriria o problema que o catálogo existe para resolver.
  const skills = await prisma.skill.findMany({
    where: { slug: { in: input.skillSlugs } },
    select: { id: true, slug: true },
  });

  if (skills.length !== new Set(input.skillSlugs).size) {
    const conhecidas = new Set(skills.map((s) => s.slug));
    const desconhecidas = input.skillSlugs.filter((slug) => !conhecidas.has(slug));
    throw badRequest(`Habilidade desconhecida: ${desconhecidas.join(', ')}`, 'UNKNOWN_SKILL');
  }

  const atual = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { slug: true },
  });

  const name = sanitizeText(input.name);

  // O slug nasce no primeiro salvamento e não é reescrito depois (ASM-016).
  const slug =
    atual.slug ??
    (await buildUniqueSlug(name, async (candidato) =>
      Boolean(await prisma.user.findUnique({ where: { slug: candidato }, select: { id: true } })),
    ));

  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      slug,
      course: sanitizeText(input.course),
      bio: sanitizeText(input.bio),
      skills: { set: skills.map((s) => ({ id: s.id })) },
      links,
      cityId: city.id,
      institutionId: institution.id,
      // Chegou aqui com nome, curso, instituição e cidade: o onboarding acabou
      // e o embaixador deixa de ser empurrado para ele (AC-009).
      profileComplete: true,
    },
    select: PROFILE_SELECT,
  });

  return toMyProfile(row);
}

/** Liga ou desliga a presença no mapa, com efeito imediato (AC-016). */
export async function updatePrivacy(
  prisma: PrismaClient,
  userId: string,
  input: PrivacyPreferences,
): Promise<MyProfile> {
  const row = await prisma.user.update({
    where: { id: userId },
    data: { visibleOnMap: input.visibleOnMap },
    select: PROFILE_SELECT,
  });

  return toMyProfile(row);
}
