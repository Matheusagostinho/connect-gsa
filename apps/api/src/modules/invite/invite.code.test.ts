import { INVITE_ALPHABET, INVITE_CODE_LENGTH, inviteCodeSchema } from '@connect-gsa/shared';
import { describe, expect, it } from 'vitest';
import { generateInviteCode, hashInviteCode, looksLikeInviteCode } from './invite.code.js';

describe('código de convite', () => {
  it('tem oito caracteres e nenhuma letra ambígua @spec:AC-133 @principle:P-009', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateInviteCode();

      expect(code).toHaveLength(INVITE_CODE_LENGTH);
      // I, L e O se confundem com 1 e 0 na leitura; U se confunde com V ao
      // ditar — que é exatamente como um convite circula.
      expect(code).not.toMatch(/[ILOU]/);
      expect(inviteCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('usa todo o alfabeto, sem viés de sorteio @principle:P-009', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 4000; i += 1) {
      for (const caractere of generateInviteCode()) vistos.add(caractere);
    }

    // `randomBytes` com resto por 32 pareceria equivalente e enviesaria o
    // alfabeto no dia em que alguém tirasse uma letra dele. `randomInt` faz a
    // rejeição de amostras por dentro.
    expect(vistos.size).toBe(INVITE_ALPHABET.length);
  });

  it('não repete um código em milhares de sorteios @principle:P-009', () => {
    const codigos = new Set(Array.from({ length: 5000 }, generateInviteCode));

    expect(codigos.size).toBe(5000);
  });

  it('trata maiúsculas e minúsculas como o MESMO convite', () => {
    const code = generateInviteCode();

    // O código circula por conversa e chega digitado de todo jeito. Sem
    // normalizar, a versão em minúsculas simplesmente não existiria.
    expect(hashInviteCode(code.toLowerCase())).toBe(hashInviteCode(code));
    expect(looksLikeInviteCode(` ${code.toLowerCase()} `)).toBe(true);
  });

  it('nunca guarda o código em claro @principle:P-009', () => {
    const code = generateInviteCode();
    const hash = hashInviteCode(code);

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(code);
  });

  it('recusa formato que não é convite, antes de tocar no banco', () => {
    for (const invalido of ['ABC5E', 'ABC5EK9MX', 'ABC5EK9I', 'abc-5ek9', '']) {
      expect(looksLikeInviteCode(invalido)).toBe(false);
    }
  });
});
