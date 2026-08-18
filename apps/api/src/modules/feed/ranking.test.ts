import { describe, expect, it } from 'vitest';
import {
  AUTHOR_DIVERSITY_FLOOR,
  RECENCY_HALF_LIFE_HOURS,
  baseScore,
  engagementValue,
  rankFeed,
  recencyFactor,
  type RankablePost,
} from './ranking.js';

const AGORA = new Date('2026-08-18T12:00:00Z');

function post(overrides: Partial<RankablePost> & { id: string }): RankablePost {
  return {
    authorId: `autor-${overrides.id}`,
    createdAt: AGORA,
    reactionCounts: {},
    commentCount: 0,
    sameInstitution: false,
    sameCity: false,
    ...overrides,
  };
}

const horasAtras = (h: number) => new Date(AGORA.getTime() - h * 3_600_000);

describe('ranking do feed', () => {
  it('põe o post mais engajado acima do parado, à mesma hora @spec:AC-035', () => {
    const engajado = post({ id: 'a', reactionCounts: { liftoff: 12 }, commentCount: 4 });
    const parado = post({ id: 'b' });

    const ordem = rankFeed([parado, engajado], AGORA).map((s) => s.post.id);

    expect(ordem).toEqual(['a', 'b']);
  });

  it('põe o recente acima do antigo com engajamento parecido @spec:AC-036', () => {
    const recente = post({ id: 'novo', reactionCounts: { liftoff: 5 } });
    const antigo = post({
      id: 'velho',
      reactionCounts: { liftoff: 5 },
      createdAt: horasAtras(72),
    });

    const ordem = rankFeed([antigo, recente], AGORA).map((s) => s.post.id);

    expect(ordem).toEqual(['novo', 'velho']);
  });

  it('espalha os posts de quem publica muito @spec:AC-037', () => {
    // O mesmo autor tem os cinco posts mais engajados; outra pessoa tem um só,
    // com engajamento bem menor.
    const prolifico = Array.from({ length: 5 }, (_, i) =>
      post({ id: `p${i}`, authorId: 'prolifico', reactionCounts: { liftoff: 20 } }),
    );
    const outra = post({ id: 'outra', authorId: 'outra-pessoa', reactionCounts: { liftoff: 3 } });

    const ordem = rankFeed([...prolifico, outra], AGORA).map((s) => s.post.authorId);

    // Sem diversidade de autor, "outra-pessoa" ficaria em sexto. Com ela, sobe.
    expect(ordem.indexOf('outra-pessoa')).toBeLessThan(5);
    expect(ordem[0]).toBe('prolifico');
  });

  it('nunca penaliza um autor abaixo do piso, por mais que ele publique', () => {
    const muitos = Array.from({ length: 20 }, (_, i) =>
      post({ id: `p${i}`, authorId: 'mesmo', reactionCounts: { liftoff: 10 } }),
    );

    const notas = rankFeed(muitos, AGORA).map((s) => s.score);
    const maior = Math.max(...notas);
    const menor = Math.min(...notas);

    expect(menor / maior).toBeCloseTo(AUTHOR_DIVERSITY_FLOOR, 5);
  });

  it('não enterra post novo sem reações sob post antigo igualmente parado @spec:AC-038', () => {
    const novoSemNada = post({ id: 'novo' });
    const antigoSemNada = post({ id: 'antigo', createdAt: horasAtras(72) });

    const ordem = rankFeed([antigoSemNada, novoSemNada], AGORA).map((s) => s.post.id);

    expect(ordem).toEqual(['novo', 'antigo']);
    // E a nota de um post sem engajamento não é zero — se fosse, a recência não
    // teria o que multiplicar e o post nasceria morto.
    expect(baseScore(novoSemNada, AGORA)).toBeGreaterThan(0);
  });

  it('vale mais comentar do que reagir, e mais oferecer ajuda do que reconhecer', () => {
    const comentado = post({ id: 'c', commentCount: 1 });
    const reagido = post({ id: 'r', reactionCounts: { liftoff: 1 } });
    const oferecido = post({ id: 'o', reactionCounts: { offerHelp: 1 } });

    expect(engagementValue(comentado)).toBeGreaterThan(engagementValue(oferecido));
    expect(engagementValue(oferecido)).toBeGreaterThan(engagementValue(reagido));
  });

  it('impulsiona quem é da mesma instituição ou cidade, sem punir os demais', () => {
    const distante = post({ id: 'd', reactionCounts: { liftoff: 4 } });
    const mesmaInstituicao = post({
      id: 'i',
      reactionCounts: { liftoff: 4 },
      sameInstitution: true,
    });

    expect(baseScore(mesmaInstituicao, AGORA)).toBeGreaterThan(baseScore(distante, AGORA));
    // O distante continua com nota cheia — a proximidade soma, não subtrai.
    expect(baseScore(distante, AGORA)).toBeGreaterThan(0);
  });

  it('reduz o peso pela metade a cada meia-vida', () => {
    const agora = post({ id: 'a' });
    const umaMeiaVida = post({ id: 'b', createdAt: horasAtras(RECENCY_HALF_LIFE_HOURS) });

    expect(recencyFactor(agora, AGORA)).toBeCloseTo(1, 5);
    expect(recencyFactor(umaMeiaVida, AGORA)).toBeCloseTo(0.5, 5);
  });

  it('trata post com data no futuro como recém-publicado, sem nota infinita', () => {
    const futuro = post({ id: 'f', createdAt: new Date(AGORA.getTime() + 3_600_000) });

    expect(recencyFactor(futuro, AGORA)).toBe(1);
  });

  it('devolve ordem estável quando as notas empatam', () => {
    const a = post({ id: 'aaa' });
    const b = post({ id: 'bbb' });

    expect(rankFeed([b, a], AGORA).map((s) => s.post.id)).toEqual(['aaa', 'bbb']);
    expect(rankFeed([a, b], AGORA).map((s) => s.post.id)).toEqual(['aaa', 'bbb']);
  });

  it('aguenta feed vazio', () => {
    expect(rankFeed([], AGORA)).toEqual([]);
  });
});
