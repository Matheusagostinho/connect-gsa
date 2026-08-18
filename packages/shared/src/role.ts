import { z } from 'zod';

/**
 * Papéis de um participante da rede (ASM-004, confirmada).
 *
 * A ordem aqui não implica hierarquia: quem decide o que cada papel pode fazer
 * é o CASL na API (`apps/api/src/authz`), nunca a posição nesta lista.
 */
export const ROLES = ['ambassador', 'moderator', 'admin'] as const;

export const roleSchema = z.enum(ROLES);

export type Role = z.infer<typeof roleSchema>;
