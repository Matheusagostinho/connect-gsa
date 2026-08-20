import { z } from 'zod';

/**
 * Direitos do titular sobre os próprios dados (LGPD art. 18, incisos V e VI).
 */

/**
 * A palavra que a pessoa digita para confirmar a exclusão.
 *
 * Exclusão é irreversível. Um botão sozinho é toque errado esperando acontecer;
 * digitar exige intenção (AC-076).
 */
export const DELETE_CONFIRMATION = 'EXCLUIR';

export const deleteAccountSchema = z.object({
  confirmation: z.literal(DELETE_CONFIRMATION, {
    message: `Digite ${DELETE_CONFIRMATION} para confirmar`,
  }),
});

export type DeleteAccount = z.infer<typeof deleteAccountSchema>;

/**
 * O arquivo de exportação.
 *
 * Inclui o e-mail da própria pessoa — é dado dela, e o direito de portabilidade
 * seria incompleto sem ele. O que NÃO entra é dado de terceiros: quem comentou
 * numa publicação sua aparece pelo nome, nunca pelo contato (AC-071).
 */
export const accountExportSchema = z.object({
  exportedAt: z.iso.datetime(),
  format: z.literal(1),
  profile: z.object({
    id: z.uuid(),
    slug: z.string().nullable(),
    name: z.string(),
    email: z.email(),
    imageUrl: z.url().nullable(),
    role: z.string(),
    course: z.string().nullable(),
    bio: z.string(),
    skills: z.array(z.string()),
    links: z.unknown(),
    institution: z.string().nullable(),
    city: z.string().nullable(),
    visibleOnMap: z.boolean(),
    createdAt: z.iso.datetime(),
  }),
  /**
   * A indicação: quem me trouxe, e quem eu trouxe.
   *
   * Faz parte dos meus dados tanto quanto uma publicação — é um vínculo entre
   * mim e outra pessoa. Deixá-la de fora tornaria a exportação incompleta a
   * partir do dia em que a rede passou a registrá-la (LGPD art. 18, V).
   *
   * Só o NOME de quem convidou e de quem entrou. Nem e-mail nem identificador:
   * a exportação é dos meus dados, e o P-002 vale aqui como em toda saída.
   */
  referral: z.object({
    invitedBy: z.string().nullable(),
    invited: z.array(z.object({ name: z.string(), joinedAt: z.iso.datetime() })),
  }),
  posts: z.array(
    z.object({
      id: z.uuid(),
      content: z.string(),
      imageUrl: z.url().nullable(),
      createdAt: z.iso.datetime(),
      reactionsReceived: z.number().int().nonnegative(),
      commentsReceived: z.number().int().nonnegative(),
    }),
  ),
  comments: z.array(
    z.object({
      id: z.uuid(),
      content: z.string(),
      createdAt: z.iso.datetime(),
      onPostBy: z.string(),
    }),
  ),
  reactions: z.array(
    z.object({ postId: z.uuid(), reaction: z.string(), createdAt: z.iso.datetime() }),
  ),
  connections: z.array(
    z.object({ name: z.string(), status: z.string(), since: z.iso.datetime() }),
  ),
});

export type AccountExport = z.infer<typeof accountExportSchema>;
