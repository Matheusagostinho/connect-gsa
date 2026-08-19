import { z } from 'zod';
import { connectionStateSchema } from './connection.schema.js';
import { skillSchema } from './directory.schema.js';
import { roleSchema } from './role.js';

/**
 * Limites do perfil.
 *
 * Ficam aqui, e só aqui: o mesmo número precisa valer no formulário do SPA e na
 * validação da API. Duplicar o limite nos dois lados é como as duas pontas
 * divergem silenciosamente.
 */
export const PROFILE_LIMITS = {
  nameMax: 80,
  bioMax: 280,
  courseMax: 120,
  skillsMax: 10,
  skillMax: 32,
  linksMax: 5,
  slugMin: 3,
  slugMax: 30,
  linkUrlMax: 300,
} as const;

/**
 * Link externo do perfil.
 *
 * Só `https`: numa rede fechada, um link `http` ou `javascript:` no perfil é
 * vetor de phishing contra os próprios embaixadores.
 */
export const linkSchema = z.object({
  label: z.string().trim().min(1).max(24),
  url: z
    .url()
    .max(PROFILE_LIMITS.linkUrlMax)
    .refine((value) => value.startsWith('https://'), { message: 'O link precisa ser https' }),
});

export type Link = z.infer<typeof linkSchema>;

/**
 * O que o embaixador envia ao criar ou atualizar o próprio perfil.
 *
 * Repare no que NÃO existe aqui: latitude e longitude. A posição do embaixador
 * vem do centroide da cidade escolhida (P-001) — o aparelho dele nunca é
 * consultado, e portanto não há coordenada precisa para vazar.
 */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(PROFILE_LIMITS.nameMax),
  institutionId: z.uuid(),
  cityId: z.uuid(),
  course: z.string().trim().min(2).max(PROFILE_LIMITS.courseMax),
  bio: z.string().trim().max(PROFILE_LIMITS.bioMax).default(''),
  /**
   * Identificadores do catálogo de habilidades, não texto livre.
   *
   * Texto livre parecia mais flexível e destruía a busca: "React", "react" e
   * "ReactJS" nunca se cruzavam, então filtrar por habilidade não encontrava
   * ninguém. A API recusa qualquer identificador fora do catálogo (AC-045).
   */
  skillSlugs: z
    .array(z.string().trim().min(1).max(PROFILE_LIMITS.skillMax))
    .max(PROFILE_LIMITS.skillsMax)
    .default([]),
  links: z.array(linkSchema).max(PROFILE_LIMITS.linksMax).default([]),
  /**
   * Nome de usuário escolhido — o endereço público do perfil.
   *
   * Opcional: quem não mexe no campo não pede troca nenhuma, e mandar o valor
   * atual de volta a cada salvamento faria toda edição de bio contar como
   * tentativa de troca. A regra de unicidade, formato e intervalo mínimo vive no
   * servidor (AC-117, AC-119) — aqui só o formato, para o erro chegar antes.
   */
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(PROFILE_LIMITS.slugMin)
    .max(PROFILE_LIMITS.slugMax)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífen.')
    .optional(),
});

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

/** Preferências de privacidade que o embaixador controla (P-011, AC-015/AC-016). */
export const privacyPreferencesSchema = z.object({
  visibleOnMap: z.boolean(),
});

export type PrivacyPreferences = z.infer<typeof privacyPreferencesSchema>;

/**
 * O perfil como a API o devolve.
 *
 * Este schema é a fronteira que cumpre o P-002: não existe campo de e-mail aqui,
 * então nenhuma rota consegue devolver um sem falhar a validação de saída.
 */
export const publicProfileSchema = z.object({
  id: z.uuid(),
  /** Endereço público e estável do perfil: `/e/{slug}`. */
  slug: z.string(),
  name: z.string(),
  imageUrl: z.url().nullable(),
  role: roleSchema,
  course: z.string(),
  bio: z.string(),
  skills: z.array(skillSchema),
  links: z.array(linkSchema),
  institution: z.object({
    id: z.uuid(),
    name: z.string(),
    campus: z.string(),
    acronym: z.string().nullable(),
  }),
  city: z.object({
    id: z.uuid(),
    name: z.string(),
    state: z.string().length(2),
    /** Centroide do município — a única localização que a rede conhece (P-001). */
    latitude: z.number(),
    longitude: z.number(),
  }),
  visibleOnMap: z.boolean(),
  profileComplete: z.boolean(),
  createdAt: z.iso.datetime(),
  /** Laços ACEITOS. Pedido pendente não conta — ninguém tem conexão com quem ainda não respondeu. */
  connectionCount: z.number().int().nonnegative().default(0),
  /** Publicações do feed. Comunicado oficial não entra: ele é da coordenação, não da pessoa. */
  postCount: z.number().int().nonnegative().default(0),
  /** Relação de quem está lendo com esta pessoa. */
  connection: connectionStateSchema.default('none'),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;

/**
 * O próprio perfil, como o dono o vê.
 *
 * Difere do perfil público em um ponto: instituição e cidade podem ser nulas,
 * porque entre criar a conta e concluir o onboarding existe um intervalo real
 * em que elas ainda não foram escolhidas (AC-009). Um perfil nesse estado nunca
 * aparece para outra pessoa — o `publicProfileSchema` sequer o aceitaria.
 *
 * Note que o e-mail continua ausente mesmo aqui: o SPA nunca precisou dele, e
 * o que não trafega não vaza.
 */
export const myProfileSchema = publicProfileSchema.extend({
  institution: publicProfileSchema.shape.institution.nullable(),
  city: publicProfileSchema.shape.city.nullable(),
  course: z.string(),
});

export type MyProfile = z.infer<typeof myProfileSchema>;
