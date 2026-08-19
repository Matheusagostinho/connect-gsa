import {
  type Link,
  type MyProfile,
  type PublicProfile,
  linkSchema,
  myProfileSchema,
  publicProfileSchema,
} from '@connect-gsa/shared';

/** Exatamente o que o serviço precisa buscar para montar um perfil público. */
export const PROFILE_SELECT = {
  id: true,
  slug: true,
  name: true,
  image: true,
  role: true,
  course: true,
  bio: true,
  links: true,
  visibleOnMap: true,
  profileComplete: true,
  createdAt: true,
  skills: { select: { slug: true, name: true, category: true } },
  institution: { select: { id: true, name: true, campus: true, acronym: true } },
  city: { select: { id: true, name: true, state: true, latitude: true, longitude: true } },
} as const;

export interface ProfileRow {
  id: string;
  slug: string | null;
  name: string;
  image: string | null;
  role: string;
  course: string | null;
  bio: string;
  skills: { slug: string; name: string; category: string }[];
  links: unknown;
  visibleOnMap: boolean;
  profileComplete: boolean;
  createdAt: Date;
  institution: { id: string; name: string; campus: string; acronym: string | null } | null;
  city: {
    id: string;
    name: string;
    state: string;
    latitude: number;
    longitude: number;
  } | null;
}

function parseLinks(value: unknown): Link[] {
  const result = linkSchema.array().safeParse(value);
  return result.success ? result.data : [];
}

/** Campos comuns às duas saídas de perfil. */
function baseProfile(row: ProfileRow) {
  return {
    id: row.id,
    // Perfil sem slug só existe entre criar a conta e concluir o onboarding.
    slug: row.slug ?? row.id,
    name: row.name,
    imageUrl: row.image,
    role: row.role,
    course: row.course ?? '',
    bio: row.bio,
    skills: row.skills,
    links: parseLinks(row.links),
    visibleOnMap: row.visibleOnMap,
    profileComplete: row.profileComplete,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Única porta de saída de um perfil para TERCEIROS (P-002).
 *
 * Toda rota que devolve o perfil de outra pessoa passa por aqui, e o retorno é
 * validado contra o `publicProfileSchema` — que não tem campo de e-mail. Isso
 * troca uma promessa ("lembre de não incluir o e-mail") por uma garantia:
 * incluir passa a ser impossível sem quebrar a validação.
 *
 * A localização devolvida é o centroide do município (P-001). Não existe, em
 * lugar nenhum do sistema, coordenada mais precisa para vazar aqui.
 *
 * Lança se instituição ou cidade estiverem ausentes — de propósito: um perfil
 * incompleto não tem o que fazer no diretório, e inventar um valor de fachada
 * só esconderia o defeito.
 */
export function toPublicProfile(
  row: ProfileRow,
  connection: PublicProfile['connection'] = 'none',
): PublicProfile {
  return publicProfileSchema.parse({
    ...baseProfile(row),
    institution: row.institution,
    city: row.city,
    connection,
  });
}

/** O próprio perfil, que pode estar a meio caminho do onboarding (AC-009). */
export function toMyProfile(row: ProfileRow): MyProfile {
  return myProfileSchema.parse({
    ...baseProfile(row),
    institution: row.institution,
    city: row.city,
  });
}
