import { REACTION_META } from '@connect-gsa/shared';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactionBar } from './ReactionBar.tsx';

describe('barra de reações', () => {
  it('usa ícone desenhado, não emoji, para a reação aparecer em qualquer sistema @spec:AC-083', () => {
    render(<ReactionBar counts={{}} mine="together" onReact={vi.fn()} />);

    // Emoji depende de fonte instalada; ícone desenhado sempre aparece.
    const botao = screen.getByRole('button', { name: /bora junto/i });
    expect(botao.querySelector('svg')).not.toBeNull();
    expect(botao.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('mostra só o ícone no cartão, sem rótulo escrito @spec:AC-111', () => {
    render(<ReactionBar counts={{ together: 1 }} mine="together" onReact={vi.fn()} />);

    const botao = screen.getByRole('button', { name: /bora junto/i });

    // Nome acessível existe (acima), texto desenhado não: o rótulo repetia o
    // que o ícone já diz e custava largura do nome de quem publicou.
    expect(botao.textContent?.trim()).toBe('');
    expect(botao.querySelector('svg')).not.toBeNull();
  });

  it('aplica a reação principal com um toque só, sem abrir lista', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(<ReactionBar counts={{}} mine={null} onReact={onReact} />);

    await user.click(screen.getByRole('button', { name: /^reagir com decolou/i }));

    expect(onReact).toHaveBeenCalledExactlyOnceWith('liftoff');
  });

  it('abre a fileira e avisa o que cada reação significa', () => {
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /reagir com decolou/i }), {
      key: 'ArrowUp',
    });

    for (const meta of Object.values(REACTION_META)) {
      expect(screen.getByRole('button', { name: `${meta.label}: ${meta.description}` })).toBeInTheDocument();
    }
  });

  it('avisa qual reação foi escolhida', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(<ReactionBar counts={{}} mine={null} onReact={onReact} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /reagir com decolou/i }), {
      key: 'ArrowUp',
    });
    await user.click(screen.getByRole('button', { name: /posso ajudar/i }));

    expect(onReact).toHaveBeenCalledExactlyOnceWith('offerHelp');
  });

  it('fecha a fileira com Escape, para não prender quem usa teclado', async () => {
    const user = userEvent.setup();
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole('button', { name: /reagir com decolou/i }), {
      key: 'ArrowUp',
    });
    expect(screen.getByRole('group', { name: /escolha uma reação/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: /escolha uma reação/i })).not.toBeInTheDocument();
  });

  it('soma o total e descreve a divisão para leitor de tela', () => {
    render(
      <ReactionBar counts={{ liftoff: 3, learned: 2 }} mine="liftoff" onReact={vi.fn()} />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/3 Decolou, 2 Aprendi/)).toBeInTheDocument();
  });

  it('não mostra contagem quando ninguém reagiu', () => {
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    expect(screen.queryByText(/reações:/)).not.toBeInTheDocument();
  });

  it('clicar na reação atual a desfaz — é o mesmo gesto do servidor', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(<ReactionBar counts={{ respect: 1 }} mine="respect" onReact={onReact} />);

    await user.click(screen.getByRole('button', { name: /respeito/i }));

    expect(onReact).toHaveBeenCalledExactlyOnceWith('respect');
  });
});

describe('cor e desenho da reação', () => {
  it('pinta a reação escolhida com a cor dela, e deixa as outras neutras @spec:AC-102', () => {
    render(<ReactionBar counts={{ together: 1 }} mine="together" onReact={vi.fn()} />);

    const botao = screen.getByRole('button', { name: /bora junto/i });
    const icone = botao.querySelector('svg');

    // A cor sai do catálogo compartilhado, não de um valor solto no componente:
    // é o mesmo dado que a API usa para descrever a reação.
    expect(icone).toHaveStyle({ color: REACTION_META.together.color });
  });

  it('não pinta nada quando ainda não reagi — cor é sinal de escolha', () => {
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    const icone = screen.getByRole('button', { name: /^reagir com decolou/i }).querySelector('svg');
    expect(icone?.getAttribute('style')).toBeFalsy();
  });

  it('desenha o traço ao trocar de reação, e só então @spec:AC-102', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    const parado = screen.getByRole('button', { name: /^reagir com decolou/i }).querySelector('svg');
    expect(parado?.classList.contains('reacao-desenha')).toBe(false);

    await user.click(screen.getByRole('button', { name: /^reagir com decolou/i }));
    rerender(<ReactionBar counts={{ liftoff: 1 }} mine="liftoff" onReact={vi.fn()} />);

    const desenhando = screen.getByRole('button', { name: /decolou/i }).querySelector('svg');
    expect(desenhando?.classList.contains('reacao-desenha')).toBe(true);
  });
});

describe('pressionar e segurar', () => {
  /**
   * O gesto depende de tempo, então o relógio é controlado.
   *
   * Aqui os eventos são disparados com `fireEvent`, e não com `userEvent`: o
   * segundo insere esperas reais entre os passos e trava contra relógio falso.
   * Como o que se mede é a SEQUÊNCIA de eventos de ponteiro, o disparo direto é
   * inclusive mais fiel ao que o navegador faz.
   */
  const fileira = () => screen.queryByRole('group', { name: /escolha uma reação/i });
  const botaoPrincipal = () => screen.getByRole('button', { name: /^reagir com decolou/i });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const esperar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it('abre a fileira ao segurar, sem aplicar reação nenhuma @spec:AC-112', () => {
    const onReact = vi.fn();
    render(<ReactionBar counts={{}} mine={null} onReact={onReact} />);

    const botao = botaoPrincipal();
    fireEvent.pointerDown(botao, { clientX: 100, clientY: 300 });

    esperar(200);
    expect(fileira()).not.toBeInTheDocument();

    esperar(300);
    expect(fileira()).toBeInTheDocument();

    fireEvent.pointerUp(botao);
    fireEvent.click(botao);

    // Segurar ESCOLHE, não reage: quem segurou quer ver as opções.
    expect(onReact).not.toHaveBeenCalled();
  });

  it('cancela a espera quando o dedo arrasta para rolar @spec:AC-113', () => {
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    const botao = botaoPrincipal();
    fireEvent.pointerDown(botao, { clientX: 100, clientY: 300 });
    fireEvent.pointerMove(botao, { clientX: 104, clientY: 220 });

    esperar(800);

    // Num feed, o dedo que desce a tela começa em cima de algum elemento. Se
    // isso abrisse a fileira, rolar viraria uma loteria de menus abertos.
    expect(fileira()).not.toBeInTheDocument();
  });

  it('um movimento mínimo não cancela — dedo não fica parado @spec:AC-113', () => {
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    const botao = botaoPrincipal();
    fireEvent.pointerDown(botao, { clientX: 100, clientY: 300 });
    fireEvent.pointerMove(botao, { clientX: 103, clientY: 297 });

    esperar(500);

    expect(fileira()).toBeInTheDocument();
  });

  it('um toque curto reage sem abrir nada', () => {
    const onReact = vi.fn();
    render(<ReactionBar counts={{}} mine={null} onReact={onReact} />);

    const botao = botaoPrincipal();
    fireEvent.pointerDown(botao, { clientX: 100, clientY: 300 });
    esperar(120);
    fireEvent.pointerUp(botao);
    fireEvent.click(botao);

    expect(onReact).toHaveBeenCalledExactlyOnceWith('liftoff');
    expect(fileira()).not.toBeInTheDocument();
  });

  it('a seta para cima abre a fileira, porque teclado não tem "segurar" @spec:AC-114', () => {
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    const botao = botaoPrincipal();

    // O botão anuncia que existe algo a abrir; sem isso, ninguém adivinharia.
    expect(botao).toHaveAttribute('aria-haspopup', 'true');

    fireEvent.keyDown(botao, { key: 'ArrowUp' });

    expect(fileira()).toBeInTheDocument();
  });
});
