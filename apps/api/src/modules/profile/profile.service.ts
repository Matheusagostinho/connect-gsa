import type { PrismaClient } from '@connect-gsa/db';
import type {
  MyProfile,
  PrivacyPreferences,
  PublicProfile,
  UpdateProfile,
} from '@connect-gsa/shared';
import { notFound } from '../../plugins/errors.js';
import { PROFILE_SELECT, toMyProfile, toPublicProfile } from './profile.mapper.js';
import { sanitizeList, sanitizeText } from './sanitize.js';

/** Busca o perfil de outra pessoa. Só perfis concluídos existem para terceiros. */
export async function getPublicProfile(
  prisma: PrismaClient,
  userId: string,
): Promise<PublicProfile> {
  const row = await prisma.user.findFirst({
    where: { id: userId, profileComplete: true },
    select: PROFILE_SELECT,
  });

  if (!row) throw notFound('Perfil não encontrado.');

  return toPublicProfile(row);
}

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

  const row = await prisma.user.update({
    where: { id: userId },
    data: {
      name: sanitizeText(input.name),
      course: sanitizeText(input.course),
      bio: sanitizeText(input.bio),
      skills: sanitizeList(input.skills),
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
