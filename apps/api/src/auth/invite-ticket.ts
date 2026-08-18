import { createSignedTicket, readSignedTicket } from './signed-ticket.js';

/**
 * O bilhete de convite: o que atravessa o vaivém do login social.
 *
 * O problema concreto: o embaixador digita o código de convite ANTES de ser
 * redirecionado ao Google, e a rede só descobre quem ele é DEPOIS de voltar.
 * Entre os dois momentos não existe sessão para guardar nada.
 *
 * O bilhete resolve isso sem confiar no cliente: é um cookie httpOnly assinado
 * contendo apenas o HASH do convite e um prazo curto. Nem o código em claro nem
 * qualquer dado pessoal viajam nele.
 */

export const INVITE_COOKIE = 'cgsa_invite';

/** Dez minutos: tempo de sobra para um login social, curto para um cookie roubado. */
export const INVITE_TICKET_TTL_MS = 10 * 60 * 1000;

export function createInviteTicket(codeHash: string, secret: string, now = Date.now()): string {
  return createSignedTicket(codeHash, secret, INVITE_TICKET_TTL_MS, now);
}

export function readInviteTicket(
  ticket: string | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  return readSignedTicket(ticket, secret, now);
}

export { readCookie } from './signed-ticket.js';
