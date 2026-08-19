import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from './ui.tsx';

/**
 * Compartilhar o endereço de um perfil.
 *
 * `navigator.share` abre a folha nativa no celular — que é de onde o link vai
 * ser mandado de verdade, para o WhatsApp do grupo. No computador ela não
 * existe, e copiar resolve; o retorno visível ("Copiado") importa porque copiar
 * é a única ação do produto que não deixa nenhum rastro na tela.
 *
 * O endereço é montado a partir de `location.origin` e do slug, e não guardado:
 * um link que a pessoa acabou de abrir é, por definição, o endereço certo.
 */
export function ShareProfile({ slug, name }: { slug: string; name: string }) {
  const [copiado, setCopiado] = useState(false);

  async function compartilhar() {
    const url = `${window.location.origin}/perfil/${slug}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name} no ConnectGSA`, url });
        return;
      } catch {
        // Cancelar a folha de compartilhamento rejeita a promessa. Não é erro:
        // a pessoa desistiu, e cair na cópia seria fazer algo que ela não pediu.
        return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void compartilhar()}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill',
        'border border-border px-4 text-sm font-medium transition-colors duration-200',
        copiado ? 'text-ink' : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
      )}
    >
      {copiado ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Share2 className="size-4" aria-hidden="true" />
      )}
      <span aria-live="polite">{copiado ? 'Copiado' : 'Compartilhar'}</span>
    </button>
  );
}
