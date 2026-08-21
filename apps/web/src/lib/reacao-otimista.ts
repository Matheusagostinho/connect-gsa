import type { Post, Reaction } from '@connect-gsa/shared';

/**
 * O que acontece com um post quando alguém reage — calculado, não adivinhado.
 *
 * Havia aqui uma decisão de NÃO aplicar reação de forma otimista, com a
 * justificativa de que "a regra tem três resultados possíveis e adivinhar qual
 * deles aconteceu é como a contagem diverge do banco". A preocupação era certa;
 * a premissa, não: os três resultados são **determinísticos** a partir de duas
 * informações que a tela já tem — a reação atual da pessoa e a que ela escolheu.
 *
 * | Estado | Escolha | Resultado |
 * |---|---|---|
 * | nenhuma | X | soma 1 em X |
 * | X | X | tira 1 de X (desfaz) |
 * | X | Y | tira 1 de X, soma 1 em Y |
 *
 * Isto é uma função PURA: sem rede, sem relógio, sem cache. É o que permite
 * cobrir os três caminhos com teste de uma linha cada e parar de tratar a regra
 * como algo que só o servidor sabe.
 *
 * E a divergência continua impossível por outro motivo: a resposta do servidor
 * traz a contagem final e sobrescreve este cálculo. Se algum dia os dois
 * discordarem, quem vale é o servidor — o otimismo só antecipa o que já viria.
 */
export function aplicarReacao(post: Post, escolhida: Reaction): Post {
  const atual = post.myReaction;
  const contagens = { ...post.reactionCounts };

  const somar = (qual: Reaction, quanto: number) => {
    const antes = contagens[qual] ?? 0;
    const depois = antes + quanto;

    // Nunca abaixo de zero: um cache velho poderia trazer contagem menor do que
    // a realidade, e um número negativo na tela é pior que um número atrasado.
    if (depois <= 0) delete contagens[qual];
    else contagens[qual] = depois;
  };

  if (atual === escolhida) {
    somar(escolhida, -1);
    return { ...post, reactionCounts: contagens, myReaction: null };
  }

  if (atual) somar(atual, -1);
  somar(escolhida, 1);

  return { ...post, reactionCounts: contagens, myReaction: escolhida };
}
