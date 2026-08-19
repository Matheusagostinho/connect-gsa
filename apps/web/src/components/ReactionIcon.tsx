import { REACTION_META, type Reaction } from '@connect-gsa/shared';
import { Award, HandHelping, Handshake, Lightbulb, Rocket, type LucideIcon } from 'lucide-react';
import { cn } from './ui.tsx';

/**
 * O ícone de cada reação.
 *
 * Ícone desenhado, não emoji: emoji depende de fonte instalada no sistema — há
 * Linux que não tem nenhuma, e lá a reação virava quadrado vazio.
 *
 * Sobre a animação: os ícones do lucide são traços SVG, então o efeito de
 * "desenhar na tela" sai de `stroke-dasharray`/`stroke-dashoffset` em CSS — a
 * mesma técnica que bibliotecas como o Vivus embrulham. Aqui ela custa algumas
 * linhas de CSS em vez de um pacote a mais, o que importa contra o teto de
 * transferência diária do plano gratuito.
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
  /** Assume a cor da reação. Só quando escolhida — senão a barra vira arco-íris. */
  colored = false,
  /** Redesenha o traço, como se estivesse sendo escrito na hora. */
  drawing = false,
}: {
  reaction: Reaction;
  className?: string;
  colored?: boolean;
  drawing?: boolean;
}) {
  const meta = REACTION_META[reaction];
  const Icone = ICONES[meta.icon] ?? Rocket;

  return (
    <Icone
      className={cn('size-4 shrink-0', drawing && 'reacao-desenha', className)}
      style={colored ? { color: meta.color } : undefined}
      aria-hidden="true"
    />
  );
}
