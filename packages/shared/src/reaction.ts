import { z } from 'zod';

/**
 * As reações do ConnectGSA.
 *
 * O conjunto é deliberadamente diferente do de outras redes. Numa rede de
 * CONEXÃO, "gostei" desperdiça a interação: as três primeiras reconhecem o
 * post, mas `together` e `offerHelp` sinalizam disposição de trabalhar junto —
 * elas não medem popularidade, medem intenção.
 *
 * `liftoff` é a principal ("Decolou"): o verbo que o brasileiro já usa para
 * projeto que deu certo, e que conversa com a linguagem de decolagem do resto
 * da identidade visual.
 */
export const REACTIONS = ['liftoff', 'learned', 'together', 'offerHelp', 'respect'] as const;

export const reactionSchema = z.enum(REACTIONS);

export type Reaction = z.infer<typeof reactionSchema>;

export interface ReactionMeta {
  /**
   * Identificador do ícone, resolvido pelo cliente.
   *
   * Não é emoji: emoji depende de fonte instalada no sistema — há Linux que
   * não tem nenhuma, e ali a reação vira quadrado vazio. Ícone desenhado
   * sempre aparece, herda a cor do tema e alinha com o resto da interface.
   */
  icon: 'rocket' | 'lightbulb' | 'award' | 'handshake' | 'helpingHand';
  label: string;
  /** Frase curta que aparece ao passar o cursor, explicando o que a reação diz. */
  description: string;
  /**
   * Quanto esta reação vale no ranking do feed.
   *
   * A escala segue o esforço e a intenção que a ação carrega, não a frequência:
   * oferecer ajuda custa mais do que reconhecer um post, e é o sinal que a rede
   * existe para produzir. Deixar tudo com peso 1 faria o feed premiar o que é
   * fácil de clicar.
   */
  weight: number;
}

export const REACTION_META: Record<Reaction, ReactionMeta> = {
  liftoff: {
    icon: 'rocket',
    label: 'Decolou',
    description: 'Isso aqui é notável',
    weight: 1,
  },
  learned: {
    icon: 'lightbulb',
    label: 'Aprendi',
    description: 'Aprendi alguma coisa com isso',
    weight: 1.5,
  },
  respect: {
    icon: 'award',
    label: 'Respeito',
    description: 'Reconheço o esforço por trás disso',
    weight: 1,
  },
  together: {
    icon: 'handshake',
    label: 'Bora junto',
    description: 'Quero construir isso com você',
    weight: 3,
  },
  offerHelp: {
    icon: 'helpingHand',
    label: 'Posso ajudar',
    description: 'Tenho como ajudar nisso',
    weight: 3,
  },
};

/** Ordem de exibição: a principal primeiro, as de intenção por último. */
export const REACTION_ORDER: readonly Reaction[] = [
  'liftoff',
  'learned',
  'respect',
  'together',
  'offerHelp',
];
