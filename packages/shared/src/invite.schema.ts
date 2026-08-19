import { z } from 'zod';

/**
 * Formato do código de convite: 8 caracteres de um alfabeto de 32 (P-009).
 *
 * ## Por que 8, e não 5
 *
 * O convite é o ÚNICO portão desta rede. Com 5 caracteres seriam 33 milhões de
 * combinações: tendo cinquenta convites ativos, um atacante acerta um a cada
 * ~670 mil tentativas — cerca de dois meses a dez mil por dia. Com 8 são 1,1
 * trilhão, e a mesma conta dá milhares de anos.
 *
 * Vale também para o banco. Ele guarda só o SHA-256 do código, e 33 milhões de
 * hashes são quebrados em segundos num vazamento; 1,1 trilhão continua custoso.
 *
 * Para quem digita, a diferença é uma sílaba.
 *
 * ## Por que este alfabeto
 *
 * Sem **I**, **L**, **O** e **U**: as três primeiras se confundem com 1 e 0 na
 * leitura, e a última com V ao ditar por telefone — que é exatamente como um
 * convite circula. É o alfabeto de Crockford, pelos mesmos motivos.
 *
 * Validar o formato ANTES de ir ao banco é o que impede que uma varredura de
 * códigos malformados vire carga de consulta no Postgres.
 */
export const INVITE_CODE_LENGTH = 8;

/** 32 símbolos, sem I, L, O e U. */
export const INVITE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`), {
    message: 'Código de convite inválido',
  });

export const redeemInviteSchema = z.object({
  code: inviteCodeSchema,
});

export type RedeemInvite = z.infer<typeof redeemInviteSchema>;

/** Quantos convites um embaixador comum pode criar por período. */
export const INVITE_QUOTA = { max: 5, days: 30 } as const;

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
  /**
   * Endereço pronto para colar no grupo.
   *
   * Montado no servidor a partir da URL pública configurada — não no cliente:
   * um link gerado a partir de `window.location` sairia com `localhost` quando
   * a coordenação estivesse testando, e ninguém perceberia até alguém tentar
   * abrir (AC-059).
   */
  shareUrl: z.url(),
  expiresAt: z.iso.datetime(),
  note: z.string().nullable(),
});

export type CreatedInvite = z.infer<typeof createdInviteSchema>;

/**
 * O convite visto por quem RECEBEU o link, antes de entrar.
 *
 * Traz o primeiro nome de quem convidou — o suficiente para a pessoa reconhecer
 * que o convite é legítimo, e pouco o bastante para não virar diretório de quem
 * está na rede para quem ainda não entrou.
 */
export const inviteInvitationSchema = z.object({
  invitedBy: z.string(),
  expiresAt: z.iso.datetime(),
});

export type InviteInvitation = z.infer<typeof inviteInvitationSchema>;
