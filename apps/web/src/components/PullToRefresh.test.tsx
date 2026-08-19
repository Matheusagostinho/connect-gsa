import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LIMIAR_PX, PullToRefresh } from './PullToRefresh.tsx';

/** Um toque na posição dada — o `fireEvent` não monta `touches` sozinho. */
const toque = (clientY: number) => ({ touches: [{ clientY, clientX: 0 }] });

function renderPuxar(onRefresh = vi.fn().mockResolvedValue(undefined)) {
  const { container } = render(
    <PullToRefresh onRefresh={onRefresh}>
      <p>feed</p>
    </PullToRefresh>,
  );

  // O gesto vive no invólucro, não num elemento com papel — é ele que precisa
  // ouvir o toque antes de qualquer filho.
  return { onRefresh, alvo: container.firstElementChild as HTMLElement };
}

describe('puxar para atualizar', () => {
  it('recarrega quando o arrasto passa do limiar @spec:AC-116', async () => {
    const { onRefresh, alvo } = renderPuxar();

    fireEvent.touchStart(alvo, toque(0));
    // A resistência é de 0,5, então o dedo precisa andar o dobro do limiar.
    fireEvent.touchMove(alvo, toque(LIMIAR_PX * 2 + 20));
    fireEvent.touchEnd(alvo);

    expect(onRefresh).toHaveBeenCalledOnce();
    expect(await screen.findByRole('status')).toHaveTextContent(/atualizando/i);
  });

  it('não recarrega num arrasto curto @spec:AC-116', () => {
    const { onRefresh, alvo } = renderPuxar();

    fireEvent.touchStart(alvo, toque(0));
    fireEvent.touchMove(alvo, toque(20));
    fireEvent.touchEnd(alvo);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('não captura o gesto quando a página não está no topo @spec:AC-116', () => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(400);
    const { onRefresh, alvo } = renderPuxar();

    // Quem está no meio do feed e arrasta para baixo quer voltar a ler o que
    // passou — capturar esse gesto sequestraria a rolagem normal.
    fireEvent.touchStart(alvo, toque(0));
    fireEvent.touchMove(alvo, toque(300));
    fireEvent.touchEnd(alvo);

    expect(onRefresh).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('devolve o gesto quando o arrasto é para cima', () => {
    const { onRefresh, alvo } = renderPuxar();

    fireEvent.touchStart(alvo, toque(200));
    fireEvent.touchMove(alvo, toque(100));
    fireEvent.touchEnd(alvo);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('mostra o conteúdo normalmente', () => {
    renderPuxar();

    expect(screen.getByText('feed')).toBeInTheDocument();
  });
});
