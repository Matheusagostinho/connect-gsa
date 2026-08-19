import { REACTION_META, type Reaction } from '@connect-gsa/shared';

/**
 * Ordenação do feed.
 *
 * ## De onde vem
 *
 * O raciocínio foi tirado do código aberto do X (`xai-org/x-algorithm`), mas os
 * pesos de lá NÃO foram copiados — e isso é deliberado. O próprio comentário no
 * `param.rs` deles avisa que aqueles números multiplicam *probabilidades
 * previstas por um modelo treinado* (P(favorite), P(reply)…), não contagens. Um
 * report vale −234 porque a probabilidade base dele é mais de mil vezes menor
 * que a de um like. Aplicar aquela tabela sobre contagens brutas, que é tudo o
 * que temos aqui, produziria ordenação sem sentido.
 *
 * O que atravessou foram quatro ideias, essas sim independentes de modelo:
 *
 * 1. **Ação de esforço vale mais que ação de toque.** Lá, resposta pesa dez
 *    vezes um like. Aqui, comentar pesa mais que reagir, e as reações de
 *    intenção ("Bora junto", "Posso ajudar") pesam mais que as de
 *    reconhecimento — ver `REACTION_META`.
 * 2. **Diversidade de autor.** Cada post seguinte do mesmo autor vale menos, até
 *    um piso. Numa rede de algumas centenas, uma pessoa prolífica tomaria a tela
 *    inteira sem isso.
 * 3. **Início frio suavizado.** A nota nunca chega a zero, então post recém
 *    publicado disputa por recência em vez de ser enterrado por ainda não ter
 *    sido visto por ninguém.
 * 4. **Proximidade em vez de desconto por estar fora da rede.** No X, quem você
 *    não segue leva multiplicador 0,75, porque lá são centenas de milhões de
 *    contas. Aqui a rede toda cabe numa sala: em vez de punir o distante,
 *    impulsionamos o próximo.
 *
 * ## Por que é uma função pura
 *
 * Sem banco, sem `Date.now()` implícito e sem sessão. Cada regra vira um teste
 * de uma linha, e o dia em que o feed "ficar estranho" a investigação começa
 * aqui, não numa consulta SQL de trinta linhas.
 */

/** Quanto um comentário vale, em relação a uma reação de reconhecimento (peso 1). */
export const COMMENT_WEIGHT = 4;

/**
 * Meia-vida da recência: em 2 horas, um post vale metade.
 *
 * Era 12h. Duas horas é o que faz o recém-publicado vencer o engajado de ontem —
 * abrir a rede e reencontrar o assunto do dia anterior no topo é o sintoma de um
 * feed que envelheceu. Em 6h um post já vale um oitavo, então o ranking continua
 * decidindo entre coisas do MESMO período, que é onde ele tem algo a dizer.
 */
export const RECENCY_HALF_LIFE_HOURS = 2;

/**
 * Suavização de início frio.
 *
 * A nota de engajamento é encolhida na direção de uma média assumida. O efeito
 * prático é que a diferença entre "0 reações" e "1 reação" para de ser a
 * diferença entre nada e tudo — o que importa para um post publicado há dez
 * minutos, que ainda não teve audiência (AC-038).
 */
export const PRIOR_STRENGTH = 3;
export const PRIOR_MEAN = 1;

/** Cada post seguinte do mesmo autor vale metade do anterior, até 25%. */
export const AUTHOR_DIVERSITY_DECAY = 0.5;
export const AUTHOR_DIVERSITY_FLOOR = 0.25;

/**
 * Afinidade: o que faz alguém ser "para você".
 *
 * Basta um sinal para contar, e mais de um soma — quem é do seu curso E do seu
 * estado sobe mais que quem só divide o estado. São impulsos, nunca filtros:
 * quem não tem nada em comum continua aparecendo, só mais abaixo (AC-099).
 */
export const PROXIMITY_BOOST = {
  sameInstitution: 0.15,
  sameCity: 0.1,
  sameCourse: 0.2,
  sameState: 0.1,
  /** Por habilidade em comum, até o teto abaixo. */
  perSharedSkill: 0.12,
  sharedSkillsCap: 0.36,
  /** Já conectados: o que a pessoa escolheu acompanhar pesa mais que o resto. */
  connected: 0.35,
} as const;

export interface RankablePost {
  id: string;
  authorId: string;
  createdAt: Date;
  /** Quantas pessoas escolheram cada reação. */
  reactionCounts: Partial<Record<Reaction, number>>;
  commentCount: number;
  sameInstitution: boolean;
  sameCity: boolean;
  sameCourse: boolean;
  sameState: boolean;
  sharedSkills: number;
  connected: boolean;
}

export interface ScoredPost {
  post: RankablePost;
  score: number;
}

/** Soma as interações, cada uma pelo que ela custa a quem interage. */
export function engagementValue(post: RankablePost): number {
  let total = post.commentCount * COMMENT_WEIGHT;

  for (const [reaction, count] of Object.entries(post.reactionCounts)) {
    total += (count ?? 0) * REACTION_META[reaction as Reaction].weight;
  }

  return total;
}

/**
 * Encolhe a nota na direção da média — é o que evita o veredito precipitado.
 *
 * O engajamento entra em LOGARITMO, não cru. Somado linearmente ele cresce sem
 * teto, e um post muito reagido ficava imbatível: nem a recência derrubava, e o
 * feed reencontrava o assunto de ontem no topo. Em log, a diferença entre 0 e 5
 * interações continua grande — que é a que importa — e a diferença entre 40 e 80
 * quase some, que é a que não importa para quem está lendo.
 */
export function smoothedQuality(post: RankablePost): number {
  const comprimido = Math.log2(1 + engagementValue(post));
  return (comprimido + PRIOR_STRENGTH * PRIOR_MEAN) / (1 + PRIOR_STRENGTH);
}

export function recencyFactor(post: RankablePost, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - post.createdAt.getTime()) / 3_600_000);
  return Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
}

export function proximityFactor(post: RankablePost): number {
  const porHabilidade = Math.min(
    post.sharedSkills * PROXIMITY_BOOST.perSharedSkill,
    PROXIMITY_BOOST.sharedSkillsCap,
  );

  return (
    1 +
    (post.sameInstitution ? PROXIMITY_BOOST.sameInstitution : 0) +
    (post.sameCity ? PROXIMITY_BOOST.sameCity : 0) +
    (post.sameCourse ? PROXIMITY_BOOST.sameCourse : 0) +
    (post.sameState ? PROXIMITY_BOOST.sameState : 0) +
    (post.connected ? PROXIMITY_BOOST.connected : 0) +
    porHabilidade
  );
}

/** `true` quando há pelo menos um sinal de afinidade — o "se enquadra". */
export function hasAffinity(post: RankablePost): boolean {
  return (
    post.sameInstitution ||
    post.sameCity ||
    post.sameCourse ||
    post.sameState ||
    post.connected ||
    post.sharedSkills > 0
  );
}

export function baseScore(post: RankablePost, now: Date): number {
  return smoothedQuality(post) * recencyFactor(post, now) * proximityFactor(post);
}

/**
 * Ordena o feed.
 *
 * A diversidade de autor é aplicada DEPOIS da primeira ordenação, e não junto
 * da nota base: a penalidade depende da posição do post entre os do mesmo
 * autor, e essa posição só existe quando a lista já está ordenada.
 */
export function rankFeed(posts: readonly RankablePost[], now: Date): ScoredPost[] {
  const porNota = posts
    .map((post) => ({ post, score: baseScore(post, now) }))
    .sort((a, b) => b.score - a.score || comparaDesempate(a.post, b.post));

  const vistosPorAutor = new Map<string, number>();

  const comDiversidade = porNota.map(({ post, score }) => {
    const anteriores = vistosPorAutor.get(post.authorId) ?? 0;
    vistosPorAutor.set(post.authorId, anteriores + 1);

    const fator = Math.max(AUTHOR_DIVERSITY_FLOOR, Math.pow(AUTHOR_DIVERSITY_DECAY, anteriores));
    return { post, score: score * fator };
  });

  return comDiversidade.sort((a, b) => b.score - a.score || comparaDesempate(a.post, b.post));
}

/** Empate resolvido por data e depois por id — a ordem precisa ser estável entre páginas. */
function comparaDesempate(a: RankablePost, b: RankablePost): number {
  const porData = b.createdAt.getTime() - a.createdAt.getTime();
  return porData !== 0 ? porData : a.id.localeCompare(b.id);
}
