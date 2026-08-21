import { describe, expect, it } from 'vitest';
import type { Post } from '@connect-gsa/shared';
import { aplicarReacao } from './reacao-otimista.js';

/**
 * Os três caminhos da regra "trocar substitui, repetir desfaz".
 *
 * Este arquivo existe para tirar a palavra "adivinhar" da conversa: a regra é
 * determinística, e cada resultado cabe num teste de uma linha.
 */
const base = {
  reactionCounts: { liftoff: 3, learned: 1 },
  myReaction: null,
} as unknown as Post;

describe('reação aplicada na hora', () => {
  it('soma quando ainda não havia reação', () => {
    const depois = aplicarReacao(base, 'liftoff');

    expect(depois.reactionCounts.liftoff).toBe(4);
    expect(depois.myReaction).toBe('liftoff');
  });

  it('desfaz quando repete a mesma', () => {
    const antes = { ...base, myReaction: 'liftoff' } as Post;
    const depois = aplicarReacao(antes, 'liftoff');

    expect(depois.reactionCounts.liftoff).toBe(2);
    expect(depois.myReaction).toBeNull();
  });

  it('troca: tira de uma e põe na outra', () => {
    const antes = { ...base, myReaction: 'liftoff' } as Post;
    const depois = aplicarReacao(antes, 'learned');

    expect(depois.reactionCounts.liftoff).toBe(2);
    expect(depois.reactionCounts.learned).toBe(2);
    expect(depois.myReaction).toBe('learned');
  });

  it('nunca deixa contagem negativa', () => {
    // Cache velho pode trazer contagem menor que a realidade. Um número
    // atrasado é tolerável; um número negativo na tela é defeito visível.
    const inconsistente = { reactionCounts: {}, myReaction: 'liftoff' } as unknown as Post;

    const depois = aplicarReacao(inconsistente, 'liftoff');

    expect(depois.reactionCounts.liftoff).toBeUndefined();
    expect(depois.myReaction).toBeNull();
  });

  it('não modifica o post original', () => {
    // O cache do React Query guarda referências; mutar em vez de copiar faria a
    // tela não redesenhar e o rollback não ter para onde voltar.
    const antes = { ...base, myReaction: 'liftoff' } as Post;
    const copia = JSON.parse(JSON.stringify(antes)) as Post;

    aplicarReacao(antes, 'learned');

    expect(antes).toEqual(copia);
  });
});
