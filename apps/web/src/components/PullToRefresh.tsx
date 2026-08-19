import { Loader2 } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from './ui.tsx';

/** Quanto o dedo precisa descer para a recarga disparar. */
export const LIMIAR_PX = 72;

/** Teto do arrasto visível — depois disso o indicador para de descer. */
const MAXIMO_PX = 110;

/**
 * Puxar para atualizar, no celular.
 *
 * Duas regras decidem se o gesto ajuda ou atrapalha:
 *
 * 1. **Só começa quando a página já está no topo.** Se a pessoa está no meio do
 *    feed e arrasta para baixo, ela quer voltar a ler o que passou — capturar
 *    esse gesto sequestraria a rolagem normal.
 * 2. **Só reage a toque.** No computador não existe o gesto: a roda do mouse
 *    tem seu próprio significado, e o navegador já oferece recarregar.
 *
 * `touchmove` precisa ser não passivo para que `preventDefault` funcione — sem
 * isso o navegador roda a própria recarga por cima da nossa em alguns Android.
 */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [puxado, setPuxado] = useState(0);
  const [recarregando, setRecarregando] = useState(false);
  const inicio = useRef<number | null>(null);

  function comecar(event: React.TouchEvent) {
    if (recarregando || window.scrollY > 0) return;
    inicio.current = event.touches[0]?.clientY ?? null;
  }

  function mover(event: React.TouchEvent) {
    if (inicio.current === null) return;

    const atual = event.touches[0]?.clientY ?? inicio.current;
    const distancia = atual - inicio.current;

    // Arrasto para CIMA a partir do topo é rolagem normal; devolvemos o gesto.
    if (distancia <= 0) {
      inicio.current = null;
      setPuxado(0);
      return;
    }

    // Resistência: o indicador anda menos que o dedo, o que dá a sensação de
    // esticar em vez de arrastar um painel.
    setPuxado(Math.min(distancia * 0.5, MAXIMO_PX));
  }

  function soltar() {
    const distancia = puxado;
    inicio.current = null;

    if (distancia < LIMIAR_PX) {
      setPuxado(0);
      return;
    }

    setRecarregando(true);
    setPuxado(LIMIAR_PX);
    void onRefresh().finally(() => {
      setRecarregando(false);
      setPuxado(0);
    });
  }

  const ativo = puxado > 0 || recarregando;

  return (
    <div onTouchStart={comecar} onTouchMove={mover} onTouchEnd={soltar} onTouchCancel={soltar}>
      <div
        aria-hidden={!recarregando}
        className="flex items-center justify-center overflow-hidden lg:hidden"
        style={{ height: puxado, transition: inicio.current === null ? 'height 200ms' : undefined }}
      >
        {ativo ? (
          <Loader2
            className={cn(
              'size-5 text-ink-muted',
              recarregando ? 'animate-spin' : 'transition-transform duration-150',
            )}
            style={recarregando ? undefined : { transform: `rotate(${puxado * 3}deg)` }}
            aria-hidden="true"
          />
        ) : null}
      </div>

      {recarregando ? (
        <p role="status" className="sr-only">
          Atualizando o feed…
        </p>
      ) : null}

      {children}
    </div>
  );
}
