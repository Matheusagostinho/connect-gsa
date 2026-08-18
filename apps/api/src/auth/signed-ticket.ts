import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Bilhete assinado: um valor curto que o navegador guarda e devolve, sem poder
 * alterá-lo.
 *
 * Serve aos casos em que ainda não existe sessão para carregar estado — o
 * convite atravessando o redirecionamento do OAuth é o exemplo canônico. O
 * conteúdo é assinado com HMAC e carrega prazo próprio: adulterar quebra a
 * assinatura, e um bilhete antigo simplesmente para de valer.
 *
 * O bilhete NÃO é sigiloso por si só — ele é íntegro. Nunca coloque aqui algo
 * que não possa ser lido; coloque o hash, não o segredo.
 */

interface TicketPayload {
  value: string;
  expiresAt: number;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSignedTicket(
  value: string,
  secret: string,
  ttlMs: number,
  now = Date.now(),
): string {
  const payload: TicketPayload = { value, expiresAt: now + ttlMs };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Devolve o valor, ou `null` se o bilhete for inválido, adulterado ou vencido.
 *
 * Todo caminho de falha devolve `null`: um bilhete quebrado é indistinguível de
 * um ausente, e o chamador trata os dois igual — o que evita a classe de bug em
 * que "erro ao validar" acaba tratado como "válido".
 */
export function readSignedTicket(
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
    if (typeof payload.value !== 'string' || typeof payload.expiresAt !== 'number') return null;
    if (payload.expiresAt <= now) return null;
    return payload.value;
  } catch {
    return null;
  }
}

/** Lê um cookie do cabeçalho bruto — nem todo chamador passa pelo Fastify. */
export function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | undefined {
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
