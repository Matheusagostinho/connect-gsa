import { REACTION_META, REACTION_ORDER, type Reaction } from '@connect-gsa/shared';
import { ChevronUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from './ui.tsx';

/** A reação aplicada por um toque só, sem escolher nada. */
const PRINCIPAL: Reaction = 'liftoff';

/**
 * A barra de reações.
 *
 * Uma reação por post, trocável: escolher outra substitui a anterior, e
 * escolher a mesma desfaz — por isso o botão principal mostra a reação ATUAL,
 * e não um rótulo fixo.
 *
 * A interação tem duas portas de propósito:
 *
 * - **O botão grande aplica "Decolou" direto.** É a reação principal, e o
 *   caminho de um toque precisa existir; obrigar a escolher numa lista a cada
 *   vez transformaria a ação mais comum na mais cara.
 * - **O chevron ao lado abre as outras.** Deixar a fileira aparecer só no
 *   cursor pareceria mais elegante, mas hover não existe em celular e não
 *   existe no teclado — e as reações de intenção ("Bora junto", "Posso
 *   ajudar"), que são o diferencial desta rede, ficariam inalcançáveis para
 *   metade das pessoas.
 */
export function ReactionBar({
  counts,
  mine,
  onReact,
  disabled = false,
}: {
  counts: Partial<Record<Reaction, number>>;
  mine: Reaction | null;
  onReact: (reaction: Reaction) => void;
  disabled?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const [pulsando, setPulsando] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;

    const fechar = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setAberta(false);
        return;
      }
      if (!container.current?.contains(event.target as Node)) setAberta(false);
    };

    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', fechar);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('keydown', fechar);
    };
  }, [aberta]);

  const total = Object.values(counts).reduce((soma: number, n) => soma + (n ?? 0), 0);
  const presentes = REACTION_ORDER.filter((reaction) => (counts[reaction] ?? 0) > 0);
  const atual = mine ? REACTION_META[mine] : REACTION_META[PRINCIPAL];

  function escolher(reaction: Reaction) {
    setPulsando(true);
    setAberta(false);
    onReact(reaction);
    window.setTimeout(() => setPulsando(false), 340);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div ref={container} className="relative">
        {aberta ? (
          <div
            role="group"
            aria-label="Escolha uma reação"
            className={cn(
              'absolute bottom-full left-0 z-10 mb-2 flex gap-0.5 rounded-card border border-border',
              'bg-surface-raised p-1.5 shadow-[var(--shadow-card)]',
              // Sem o teto, a fileira ultrapassa a borda da tela em 375px e
              // aparece uma barra de rolagem horizontal na página inteira.
              'max-w-[calc(100vw-2.5rem)]',
            )}
          >
            {REACTION_ORDER.map((reaction, indice) => {
              const meta = REACTION_META[reaction];
              return (
                <button
                  key={reaction}
                  type="button"
                  title={meta.description}
                  aria-label={`${meta.label}: ${meta.description}`}
                  aria-pressed={mine === reaction}
                  onClick={() => escolher(reaction)}
                  style={{ animationDelay: `${indice * 28}ms` }}
                  className={cn(
                    'reacao-entra flex w-[3.25rem] shrink cursor-pointer flex-col items-center gap-0.5 sm:w-16',
                    'rounded-field px-1 py-2 transition-transform duration-150 hover:scale-108',
                    mine === reaction && 'bg-surface-subtle',
                  )}
                >
                  <span aria-hidden="true" className="text-xl leading-none">
                    {meta.emoji}
                  </span>
                  {/*
                    O rótulo não é redundante com o emoji: "Bora junto" e "Posso
                    ajudar" são intenções, e nenhum emoji as comunica sozinho.
                    De quebra, a fileira continua legível onde o sistema não tem
                    fonte de emoji instalada.
                  */}
                  <span className="text-[0.65rem] leading-tight font-medium text-ink-muted">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          className={cn(
            'flex items-center rounded-pill border transition-colors duration-200',
            mine ? 'border-transparent bg-surface-subtle' : 'border-border',
          )}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => escolher(mine ?? PRINCIPAL)}
            aria-pressed={mine !== null}
            className={cn(
              'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-pill pr-2 pl-4',
              'text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed',
              mine ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <span aria-hidden="true" className={cn(pulsando && 'reacao-escolhida', 'inline-block')}>
              {atual.emoji}
            </span>
            {mine ? atual.label : 'Reagir'}
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setAberta((estava) => !estava)}
            aria-expanded={aberta}
            aria-haspopup="true"
            aria-label="Escolher outra reação"
            className="flex min-h-10 cursor-pointer items-center rounded-pill pr-3 pl-1 text-ink-muted transition-colors duration-200 hover:text-ink disabled:cursor-not-allowed"
          >
            <ChevronUp
              className={cn('size-4 transition-transform duration-200', aberta && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {total > 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-muted">
          <span aria-hidden="true" className="flex">
            {presentes.map((reaction) => (
              <span key={reaction} className="text-base">
                {REACTION_META[reaction].emoji}
              </span>
            ))}
          </span>
          <span>{total}</span>
          <span className="sr-only">
            reações: {presentes.map((r) => `${counts[r]} ${REACTION_META[r].label}`).join(', ')}
          </span>
        </p>
      ) : null}
    </div>
  );
}
