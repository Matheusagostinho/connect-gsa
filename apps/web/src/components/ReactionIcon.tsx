import { REACTION_META, type Reaction } from '@connect-gsa/shared';
import { Award, HandHelping, Handshake, Lightbulb, Rocket, type LucideIcon } from 'lucide-react';
import { cn } from './ui.tsx';

/**
 * O ícone de cada reação.
 *
 * Ícone desenhado, não emoji: emoji depende de fonte instalada no sistema — há
 * Linux que não tem nenhuma, e lá a reação virava quadrado vazio. Ícone sempre
 * aparece, herda a cor do tema e alinha com o resto da interface.
 */
const ICONES: Record<string, LucideIcon> = {
  rocket: Rocket,
  lightbulb: Lightbulb,
  award: Award,
  handshake: Handshake,
  helpingHand: HandHelping,
};

export function ReactionIcon({
  reaction,
  className,
}: {
  reaction: Reaction;
  className?: string;
}) {
  const Icone = ICONES[REACTION_META[reaction].icon] ?? Rocket;
  return <Icone className={cn('size-4 shrink-0', className)} aria-hidden="true" />;
}
