import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { cn } from './ui.tsx';

/**
 * O aviso curto que aparece quando uma ação otimista dá errado.
 *
 * Por que ele existe: a interface passou a aplicar reação, comentário e edição
 * de perfil ANTES da resposta do servidor. Quando o servidor recusa, a tela
 * desfaz — e desfazer em silêncio é pior que a espera que substituímos. A pessoa
 * veria o próprio gesto sendo revertido sem explicação e concluiria que o
 * aplicativo é instável.
 *
 * `role="status"` e não `role="alert"`: alerta interrompe o leitor de tela no
 * meio da frase, e isto é a consequência de uma ação que a pessoa acabou de
 * fazer — ela já está prestando atenção aqui. Para o caso de erro o `aria-live`
 * sobe para `assertive`, porque aí há algo que ela precisa saber que não
 * aconteceu.
 */
type Tipo = 'erro' | 'ok';

interface Aviso {
  id: number;
  tipo: Tipo;
  texto: string;
}

interface Contexto {
  avisar: (texto: string, tipo?: Tipo) => void;
}

const ToastContext = createContext<Contexto | null>(null);

/** Quanto tempo o aviso fica. Curto para o ok, mais longo para o erro. */
const DURACAO: Record<Tipo, number> = { ok: 2500, erro: 5000 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const proximo = useRef(0);

  const avisar = useCallback((texto: string, tipo: Tipo = 'erro') => {
    const id = (proximo.current += 1);
    setAvisos((atuais) => [...atuais, { id, tipo, texto }]);

    window.setTimeout(() => {
      setAvisos((atuais) => atuais.filter((a) => a.id !== id));
    }, DURACAO[tipo]);
  }, []);

  // `useMemo` porque o valor do contexto vai para toda a árvore: recriá-lo a
  // cada render invalidaria os consumidores sem que nada tenha mudado.
  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <ToastContext value={valor}>
      {children}

      {/*
        Fixo no rodapé no celular e no canto no computador. `pointer-events-none`
        no contêiner e `auto` no aviso: a pilha não pode roubar o toque de quem
        está usando a tela por baixo dela.
      */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            aria-live={aviso.tipo === 'erro' ? 'assertive' : 'polite'}
            className={cn(
              'pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-field border px-4 py-3 text-sm shadow-card',
              // `motion-safe` e não uma animação sempre ligada: quem pediu menos
              // movimento recebe o aviso parado, não a ausência dele.
              'motion-safe:animate-[toast-entra_200ms_ease-out]',
              aviso.tipo === 'erro'
                ? 'border-danger/30 bg-surface-raised text-ink'
                : 'border-border bg-surface-raised text-ink',
            )}
          >
            {aviso.tipo === 'erro' ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            ) : (
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            <span>{aviso.texto}</span>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

/**
 * Fora do provedor, avisar não faz nada — e isso é deliberado.
 *
 * Um componente usado num teste isolado, sem a árvore inteira, não deve
 * quebrar por causa de um aviso que ninguém veria. Lançar aqui transformaria
 * uma decoração ausente em falha de renderização.
 */
export function useToast(): Contexto {
  return use(ToastContext) ?? { avisar: () => undefined };
}
