import type { Skill } from '@connect-gsa/shared';
import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from './ui.tsx';

/**
 * O catálogo de habilidades, num painel que só abre quando pedido.
 *
 * Ele ficava aberto sobre o diretório: no celular, as habilidades ocupavam meia
 * tela antes de a primeira PESSOA aparecer — e o diretório existe para mostrar
 * pessoas, não etiquetas. Escondê-lo atrás de um botão devolve a tela ao
 * conteúdo e não tira nada de quem quer filtrar.
 *
 * `dialog` nativo pelo mesmo motivo de sempre: foco preso, Escape e ocultação do
 * resto da página sem uma linha de JavaScript.
 */
export function SkillFilterPanel({
  aberto,
  skills,
  selecionada,
  onSelect,
  onClose,
}: {
  aberto: boolean;
  skills: readonly Skill[];
  selecionada: string | undefined;
  onSelect: (slug: string | undefined) => void;
  onClose: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;

    if (aberto && !elemento.open) elemento.showModal();
    if (!aberto && elemento.open) elemento.close();
  }, [aberto]);

  // Agrupar por categoria é o que torna 78 etiquetas percorríveis: sem os
  // títulos, a lista vira uma parede de pílulas em ordem arbitrária.
  const porCategoria = new Map<string, Skill[]>();
  for (const skill of skills) {
    porCategoria.set(skill.category, [...(porCategoria.get(skill.category) ?? []), skill]);
  }

  return (
    <dialog
      ref={dialogo}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogo.current) onClose();
      }}
      aria-label="Filtrar por habilidade"
      className={cn(
        'w-full max-w-lg rounded-t-card border border-border bg-surface-raised p-0 text-ink',
        'backdrop:bg-black/40 backdrop:backdrop-blur-[2px]',
        'mx-auto mt-auto mb-0 max-h-[80dvh] overflow-hidden sm:my-auto sm:rounded-card',
      )}
    >
      <div className="flex max-h-[80dvh] flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border p-5">
          <h2 className="text-lg font-medium">Filtrar por habilidade</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {selecionada ? (
            <button
              type="button"
              onClick={() => {
                onSelect(undefined);
                onClose();
              }}
              className="mb-5 min-h-11 cursor-pointer text-sm font-medium text-ink underline"
            >
              Limpar o filtro
            </button>
          ) : null}

          {[...porCategoria.entries()].map(([categoria, lista]) => (
            <section key={categoria} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
                {categoria}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {lista.map((skill) => {
                  const ativa = selecionada === skill.slug;
                  return (
                    <li key={skill.slug}>
                      <button
                        type="button"
                        aria-pressed={ativa}
                        onClick={() => {
                          onSelect(ativa ? undefined : skill.slug);
                          onClose();
                        }}
                        className={cn(
                          'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-pill px-3',
                          'text-sm transition-colors duration-200',
                          ativa
                            ? 'bg-action text-on-action'
                            : 'border border-border text-ink-muted hover:text-ink',
                        )}
                      >
                        {ativa ? <Check className="size-3.5" aria-hidden="true" /> : null}
                        {skill.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
