import { PenLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from './ui.tsx';

/** A partir de onde a caixa de escrever já saiu da tela. */
const APARECE_APOS_PX = 320;

/**
 * Botão flutuante de publicar, que aparece ao rolar.
 *
 * A caixa de escrever mora no topo do feed. Quem desceu vinte publicações e
 * lembrou de algo teria que voltar ao começo — e o caminho de volta é
 * exatamente onde a vontade de publicar se perde.
 *
 * Ele não abre um formulário próprio: leva de volta à caixa que já existe e põe
 * o cursor nela. Dois lugares para escrever a mesma coisa seriam duas
 * implementações do mesmo limite de caracteres, do mesmo envio de imagem e do
 * mesmo tratamento de erro.
 */
export function NewPostButton() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const aoRolar = () => setVisivel(window.scrollY > APARECE_APOS_PX);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  return (
    <button
      type="button"
      // `inert` quando escondido: sem isso o botão continua alcançável por
      // teclado enquanto está invisível, e o foco some da tela.
      {...(visivel ? {} : { inert: true })}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('composer')?.focus({ preventScroll: true });
      }}
      className={cn(
        'fixed right-5 z-30 flex size-14 items-center justify-center rounded-pill',
        'bg-action text-on-action shadow-[var(--shadow-card)]',
        'transition-all duration-200 motion-reduce:transition-none',
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-8',
        visivel
          ? 'pointer-events-auto scale-100 cursor-pointer opacity-100'
          : 'pointer-events-none scale-90 opacity-0',
      )}
    >
      <PenLine className="size-5" aria-hidden="true" />
      <span className="sr-only">Escrever uma publicação</span>
    </button>
  );
}
