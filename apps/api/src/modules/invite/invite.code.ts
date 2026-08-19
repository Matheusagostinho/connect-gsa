import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { INVITE_ALPHABET, INVITE_CODE_LENGTH } from '@connect-gsa/shared';

/**
 * Geração e verificação do código de convite (P-009).
 *
 * Três decisões sustentam este arquivo:
 *
 * 1. **`randomInt` do `node:crypto`, nunca `Math.random`.** Um gerador
 *    previsível transformaria oito caracteres em zero: bastaria reproduzir a
 *    sequência. E `randomInt` faz a rejeição de amostras por dentro — usar
 *    `randomBytes` com `% 32` enviesaria o alfabeto se ele não fosse potência
 *    de dois, e depender dessa coincidência é o tipo de coisa que quebra no dia
 *    em que alguém tira uma letra do alfabeto.
 * 2. **Oito caracteres de 32 símbolos = 1,1 trilhão.** O raciocínio completo,
 *    com os números que descartaram cinco caracteres, está no
 *    `inviteCodeSchema`.
 * 3. **O banco guarda apenas o SHA-256.** Um dump vazado não entrega convite
 *    utilizável, e nem nós conseguimos recuperar um código já emitido.
 */

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}

/**
 * O hash do código.
 *
 * Normaliza para MAIÚSCULAS antes de somar: o código circula por conversa e
 * chega digitado de todo jeito. Sem normalizar, `abc5ek9m` e `ABC5EK9M` seriam
 * convites diferentes, e o segundo simplesmente não existiria.
 */
export function hashInviteCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase(), 'utf8').digest('hex');
}

/**
 * Compara dois hashes sem vazar, pelo tempo de resposta, quantos caracteres
 * batiam. Contra este espaço o ganho prático é pequeno, mas o custo de fazer
 * certo é zero.
 */
export function inviteHashEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function looksLikeInviteCode(value: string): boolean {
  return new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`).test(value.trim().toUpperCase());
}
