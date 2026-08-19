import type { FeedTab } from '@connect-gsa/shared';
import { cn } from './ui.tsx';

const ABAS: { value: FeedTab; label: string; descricao: string }[] = [
  {
    value: 'forYou',
    label: 'Para você',
    descricao: 'Gente do seu curso, do seu estado e com as suas habilidades aparece primeiro',
  },
  {
    value: 'following',
    label: 'Seguindo',
    descricao: 'Só quem já é sua conexão',
  },
];

/**
 * As duas leituras do feed.
 *
 * `tablist` de verdade, não dois links: quem navega por teclado espera trocar
 * de aba com as setas, e um leitor de tela precisa saber que são duas visões do
 * mesmo conteúdo — não duas páginas diferentes.
 */
export function FeedTabs({
  atual,
  onChange,
}: {
  atual: FeedTab;
  onChange: (tab: FeedTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Como ver o feed"
      // Sem `sticky` próprio: as abas moram DENTRO do cabeçalho da página, e é
      // ele que gruda no topo. Duas coisas grudadas uma dentro da outra brigam
      // por posição e a borda inferior aparece duplicada.
      className="flex w-full"
    >
      {ABAS.map(({ value, label, descricao }) => {
        const ativa = atual === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={ativa}
            title={descricao}
            onClick={() => onChange(value)}
            className={cn(
              'relative flex-1 cursor-pointer px-4 py-3.5 text-sm transition-colors duration-200',
              ativa ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {label}
            {/*
              O indicador ocupa a aba INTEIRA, não um traço curto no meio: com
              duas abas largas, um traço de 56px no centro lia como enfeite em
              vez de posição — e num toque rápido é a extensão que diz onde se
              está, não o desenho.
            */}
            {ativa ? (
              <span
                aria-hidden="true"
                className="spark-gradient absolute inset-x-0 bottom-0 h-1 rounded-pill"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
