import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { INVITE_CODE_LENGTH } from '@connect-gsa/shared';

/**
 * Geração e verificação do código de convite (P-009).
 *
 * Duas decisões sustentam este arquivo:
 *
 * 1. O código tem 128 bits vindos de `randomBytes`. Sequencial, baseado em
 *    tempo ou em `Math.random` seria varrível — e um convite adivinhado é uma
 *    conta a mais numa rede que deveria ser fechada.
 * 2. O banco guarda apenas o SHA-256. Um dump vazado não entrega convite
 *    utilizável, e nem nós conseguimos recuperar um código já emitido.
 */

const CODE_BYTES = 16; // 16 bytes = 128 bits = 32 caracteres hexadecimais

export function generateInviteCode(): string {
  return randomBytes(CODE_BYTES).toString('hex');
}

export function hashInviteCode(code: string): string {
  return createHash('sha256').update(code.trim().toLowerCase(), 'utf8').digest('hex');
}

/**
 * Compara dois hashes sem vazar, pelo tempo de resposta, quantos caracteres
 * batiam. Contra 128 bits de entropia o ganho prático é pequeno, mas o custo
 * de fazer certo é zero.
 */
export function inviteHashEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function looksLikeInviteCode(value: string): boolean {
  return new RegExp(`^[0-9a-f]{${INVITE_CODE_LENGTH}}$`).test(value.trim().toLowerCase());
}
