import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Bilhete de convite: o que atravessa o vaivém do login social.
 *
 * O problema concreto: o embaixador digita o código de convite ANTES de ser
 * redirecionado ao Google, e a rede só descobre quem ele é DEPOIS de voltar.
 * Entre os dois momentos não existe sessão para guardar nada.
 *
 * O bilhete resolve isso sem confiar no cliente: é um cookie httpOnly assinado
 * com HMAC contendo apenas o HASH do convite e um prazo curto. Adulterar
 * quebra a assinatura; roubar do navegador é impossível por JavaScript; e nem
 * o código em claro nem qualquer dado pessoal viajam nele.
 */

export const INVITE_COOKIE = 'cgsa_invite';

/** Dez minutos: tempo de sobra para um login social, curto para um cookie roubado. */
export const INVITE_TICKET_TTL_MS = 10 * 60 * 1000;

interface TicketPayload {
  codeHash: string;
  expiresAt: number;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createInviteTicket(codeHash: string, secret: string, now = Date.now()): string {
  const payload: TicketPayload = { codeHash, expiresAt: now + INVITE_TICKET_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Devolve o hash do convite, ou `null` se o bilhete for inválido, adulterado
 * ou vencido. Todo caminho de falha devolve `null`: um bilhete quebrado é
 * indistinguível de um ausente, e o chamador trata os dois igual.
 */
export function readInviteTicket(
  ticket: string | undefined,
  secret: string,
  now = Date.now(),
): string | null {
  if (!ticket) return null;

  const separator = ticket.lastIndexOf('.');
  if (separator <= 0) return null;

  const encoded = ticket.slice(0, separator);
  const signature = ticket.slice(separator + 1);

  const expected = sign(encoded, secret);
  const a = Buffer.from(signature, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TicketPayload;
    if (typeof payload.codeHash !== 'string' || typeof payload.expiresAt !== 'number') return null;
    if (payload.expiresAt <= now) return null;
    return payload.codeHash;
  } catch {
    return null;
  }
}

/** Lê um cookie do cabeçalho bruto — o hook do Better Auth não passa por Fastify. */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}
