import { z } from 'zod';

/**
 * Formato do código de convite: 32 caracteres hexadecimais = 128 bits (P-009).
 *
 * Validar o formato ANTES de ir ao banco é o que impede que uma varredura de
 * códigos malformados vire carga de consulta no Postgres.
 */
export const INVITE_CODE_LENGTH = 32;

export const inviteCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[0-9a-f]{32}$/, { message: 'Código de convite inválido' });

export const redeemInviteSchema = z.object({
  code: inviteCodeSchema,
});

export type RedeemInvite = z.infer<typeof redeemInviteSchema>;

export const createInviteSchema = z.object({
  /** Quantos dias o convite continua válido. Convite eterno é convite vazado. */
  validityDays: z.number().int().min(1).max(90).default(30),
  note: z.string().trim().max(120).optional(),
});

export type CreateInvite = z.infer<typeof createInviteSchema>;

/**
 * O convite recém-criado, devolvido ao administrador.
 *
 * O código em claro aparece uma única vez, no momento da criação: o banco guarda
 * apenas o hash (P-009), então nem nós conseguimos recuperá-lo depois.
 */
export const createdInviteSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  expiresAt: z.iso.datetime(),
  note: z.string().nullable(),
});

export type CreatedInvite = z.infer<typeof createdInviteSchema>;
