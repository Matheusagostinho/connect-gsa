import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PixelCloud } from './PixelCloud.tsx';

/**
 * O jsdom não desenha, mas sabe dizer O QUE foi chamado.
 *
 * É o que dá para provar aqui, e é justamente o que costuma quebrar: se o laço
 * roda quando não devia, se a nuvem rouba clique, e se ela some ao sair de foco.
 */
function espionarContexto() {
  const chamadas = { arc: 0, clearRect: 0 };
  const contexto = {
    setTransform: vi.fn(),
    clearRect: vi.fn(() => void (chamadas.clearRect += 1)),
    beginPath: vi.fn(),
    arc: vi.fn(() => void (chamadas.arc += 1)),
    fill: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  };

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    contexto as unknown as CanvasRenderingContext2D,
  );

  // O jsdom devolve 0 para todo tamanho; sem isto a malha nasceria vazia.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);

  return chamadas;
}

function comMovimento(reduzido: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduzido && query.includes('reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('nuvem de pixels', () => {
  it('desenha a malha de pontos @spec:AC-125', () => {
    const chamadas = espionarContexto();
    comMovimento(false);

    render(<PixelCloud />);

    expect(chamadas.arc).toBeGreaterThan(50);
  });

  it('não anima para quem pediu menos movimento — mas ainda desenha @spec:AC-126', () => {
    const chamadas = espionarContexto();
    comMovimento(true);
    const rAF = vi.spyOn(window, 'requestAnimationFrame');

    render(<PixelCloud />);

    // Desenhar uma vez, parado, é melhor que mostrar um retângulo vazio.
    expect(chamadas.arc).toBeGreaterThan(50);
    expect(rAF).not.toHaveBeenCalled();
  });

  it('não captura clique — os botões estão por cima dela @spec:AC-126', () => {
    espionarContexto();
    comMovimento(false);

    const { container } = render(<PixelCloud />);
    const canvas = container.querySelector('canvas');

    expect(canvas?.className).toContain('pointer-events-none');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('para o laço ao desmontar, para não animar página que saiu da tela @spec:AC-126', () => {
    espionarContexto();
    comMovimento(false);
    const cancelar = vi.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = render(<PixelCloud />);
    unmount();

    expect(cancelar).toHaveBeenCalled();
  });

  it('solta os ouvintes da janela ao desmontar', () => {
    espionarContexto();
    comMovimento(false);
    const remover = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<PixelCloud />);
    unmount();

    expect(remover).toHaveBeenCalledWith('pointermove', expect.any(Function));
  });
});
