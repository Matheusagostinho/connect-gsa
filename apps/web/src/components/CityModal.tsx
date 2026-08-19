import type { MapCity } from '@connect-gsa/shared';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { AmbassadorCardItem } from './AmbassadorCardItem.tsx';
import { useCityPeople } from '../lib/directory.js';
import { cn } from './ui.tsx';

/**
 * Quem está numa cidade, sobre o mapa.
 *
 * Elemento `dialog` nativo, e não uma `div` com aparência de modal: ele traz de
 * graça o que costuma ser reimplementado errado — prender o foco dentro,
 * fechar com Escape e esconder o resto da página do leitor de tela.
 *
 * No celular sobe de baixo, ocupando parte da tela; no computador fica
 * centralizado. Em ambos, o mapa continua visível atrás — é o contexto do que
 * se está lendo.
 */
export function CityModal({ city, onClose }: { city: MapCity | null; onClose: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const { data: pessoas = [], isPending } = useCityPeople(city?.cityId ?? null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;

    if (city && !elemento.open) elemento.showModal();
    if (!city && elemento.open) elemento.close();
  }, [city]);

  return (
    <dialog
      ref={dialogo}
      onClose={onClose}
      // Fechar ao clicar fora: o `dialog` nativo não faz isso sozinho, e o
      // backdrop é o próprio elemento quando o clique cai fora do conteúdo.
      onClick={(event) => {
        if (event.target === dialogo.current) onClose();
      }}
      className={cn(
        'w-full max-w-lg rounded-t-card border border-border bg-surface-raised p-0 text-ink',
        'backdrop:bg-black/40 backdrop:backdrop-blur-[2px]',
        // O `dialog` nativo se centraliza com `margin: auto` nos QUATRO lados.
        // Declarar `mt-auto mb-0` para colar no rodapé do celular derrubava
        // também a centralização horizontal, e o modal encostava na borda
        // esquerda do computador. Daí `mx-auto` explícito nos dois casos.
        'mx-auto mt-auto mb-0 max-sm:max-w-none sm:my-auto sm:rounded-card',
        'max-h-[75dvh] overflow-hidden',
      )}
      aria-label={city ? `Embaixadores em ${city.city}` : 'Embaixadores da cidade'}
    >
      {city ? (
        <div className="flex max-h-[75dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="min-w-0">
              <h2 className="display truncate text-xl">
                {city.city}/{city.state}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {city.count} {city.count === 1 ? 'embaixador' : 'embaixadores'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {isPending ? (
              <p className="py-6 text-center text-ink-muted" role="status">
                Carregando…
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pessoas.map((pessoa) => (
                  <li key={pessoa.id}>
                    <AmbassadorCardItem person={pessoa} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
