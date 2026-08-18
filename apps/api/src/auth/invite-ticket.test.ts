import { describe, expect, it } from 'vitest';
import {
  INVITE_TICKET_TTL_MS,
  createInviteTicket,
  readCookie,
  readInviteTicket,
} from './invite-ticket.js';

const SECRET = 'segredo-de-teste-com-tamanho-suficiente-para-hmac';
const HASH = 'a'.repeat(64);

describe('bilhete de convite', () => {
  it('vai e volta preservando o hash do convite', () => {
    const ticket = createInviteTicket(HASH, SECRET);
    expect(readInviteTicket(ticket, SECRET)).toBe(HASH);
  });

  it('recusa bilhete adulterado', () => {
    const ticket = createInviteTicket(HASH, SECRET);
    const [encoded, signature] = ticket.split('.');

    // Troca o conteúdo mantendo a assinatura antiga.
    const forjado = Buffer.from(
      JSON.stringify({ codeHash: 'b'.repeat(64), expiresAt: Date.now() + 60_000 }),
      'utf8',
    ).toString('base64url');

    expect(readInviteTicket(`${forjado}.${signature ?? ''}`, SECRET)).toBeNull();
    expect(readInviteTicket(`${encoded ?? ''}.assinaturaerrada`, SECRET)).toBeNull();
  });

  it('recusa bilhete assinado com outro segredo', () => {
    const ticket = createInviteTicket(HASH, 'outro-segredo-completamente-diferente-aqui');
    expect(readInviteTicket(ticket, SECRET)).toBeNull();
  });

  it('recusa bilhete vencido', () => {
    const emitidoEm = Date.now();
    const ticket = createInviteTicket(HASH, SECRET, emitidoEm);

    expect(readInviteTicket(ticket, SECRET, emitidoEm + INVITE_TICKET_TTL_MS - 1)).toBe(HASH);
    expect(readInviteTicket(ticket, SECRET, emitidoEm + INVITE_TICKET_TTL_MS + 1)).toBeNull();
  });

  it('trata bilhete ausente ou malformado como ausente', () => {
    expect(readInviteTicket(undefined, SECRET)).toBeNull();
    expect(readInviteTicket('', SECRET)).toBeNull();
    expect(readInviteTicket('semponto', SECRET)).toBeNull();
    expect(readInviteTicket('.só-assinatura', SECRET)).toBeNull();
  });

  it('lê o cookie certo do cabeçalho bruto', () => {
    const header = 'outro=1; cgsa_invite=valor-do-bilhete; mais=2';
    expect(readCookie(header, 'cgsa_invite')).toBe('valor-do-bilhete');
    expect(readCookie(header, 'inexistente')).toBeUndefined();
    expect(readCookie(undefined, 'cgsa_invite')).toBeUndefined();
  });
});
