import { z } from 'zod';

/**
 * Contratos da descoberta: habilidades, instituições, diretório e mapa.
 */

export const skillSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.string(),
});

export type Skill = z.infer<typeof skillSchema>;

export const institutionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Vazio quando a instituição não tem campi. */
  campus: z.string(),
  acronym: z.string().nullable(),
  /** `true` quando ainda aguarda aprovação da coordenação. */
  pending: z.boolean(),
});

export type Institution = z.infer<typeof institutionSchema>;

export const proposeInstitutionSchema = z.object({
  name: z.string().trim().min(4).max(160),
  campus: z.string().trim().max(80).default(''),
  acronym: z.string().trim().max(20).optional(),
});

export type ProposeInstitution = z.infer<typeof proposeInstitutionSchema>;

/** Um embaixador como ele aparece numa lista — do diretório ou do mapa. */
export const ambassadorCardSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  imageUrl: z.url().nullable(),
  course: z.string(),
  institution: z.string().nullable(),
  city: z.string().nullable(),
  skills: z.array(skillSchema),
  /** Relação de quem está lendo com esta pessoa. */
  connection: z.enum(['none', 'pendingSent', 'pendingReceived', 'connected', 'self']),
});

export type AmbassadorCard = z.infer<typeof ambassadorCardSchema>;

export const directoryQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  skill: z.string().trim().max(80).optional(),
  institutionId: z.uuid().optional(),
  cityId: z.uuid().optional(),
  cursor: z.string().max(200).optional(),
});

export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;

export const directoryPageSchema = z.object({
  people: z.array(ambassadorCardSchema),
  nextCursor: z.string().nullable(),
});

export type DirectoryPage = z.infer<typeof directoryPageSchema>;

/**
 * Um ponto do mapa: uma CIDADE, nunca uma pessoa.
 *
 * As coordenadas são o centro do município e são iguais para todo mundo que
 * está lá (P-001). Não existe, em lugar nenhum do sistema, posição mais fina
 * para ser desenhada — nem por engano.
 */
export const mapCitySchema = z.object({
  cityId: z.uuid(),
  city: z.string(),
  state: z.string().length(2),
  latitude: z.number(),
  longitude: z.number(),
  count: z.number().int().positive(),
  /** Algumas fotos para o pino; a lista completa vem ao clicar. */
  preview: z.array(
    z.object({ id: z.uuid(), slug: z.string(), name: z.string(), imageUrl: z.url().nullable() }),
  ),
});

export type MapCity = z.infer<typeof mapCitySchema>;
