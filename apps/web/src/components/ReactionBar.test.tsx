import { REACTION_META } from '@connect-gsa/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReactionBar } from './ReactionBar.tsx';

describe('barra de reações', () => {
  it('usa ícone desenhado, não emoji, para a reação aparecer em qualquer sistema @spec:AC-083', () => {
    render(<ReactionBar counts={{}} mine="together" onReact={vi.fn()} />);

    // Emoji depende de fonte instalada; ícone desenhado sempre aparece.
    const botao = screen.getByRole('button', { name: /bora junto/i });
    expect(botao.querySelector('svg')).not.toBeNull();
    expect(botao.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('mostra "Reagir" quando ainda não reagi', () => {
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    expect(screen.getByRole('button', { name: /^reagir$/i })).toBeInTheDocument();
  });

  it('mostra a reação atual no botão, para o estado ser legível sem abrir nada', () => {
    render(<ReactionBar counts={{ together: 1 }} mine="together" onReact={vi.fn()} />);

    expect(screen.getByRole('button', { name: /bora junto/i })).toBeInTheDocument();
  });

  it('aplica a reação principal com um toque só, sem abrir lista', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(<ReactionBar counts={{}} mine={null} onReact={onReact} />);

    await user.click(screen.getByRole('button', { name: /^reagir$/i }));

    expect(onReact).toHaveBeenCalledExactlyOnceWith('liftoff');
  });

  it('abre a fileira e avisa o que cada reação significa', async () => {
    const user = userEvent.setup();
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /escolher outra reação/i }));

    for (const meta of Object.values(REACTION_META)) {
      expect(screen.getByRole('button', { name: `${meta.label}: ${meta.description}` })).toBeInTheDocument();
    }
  });

  it('avisa qual reação foi escolhida', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();
    render(<ReactionBar counts={{}} mine={null} onReact={onReact} />);

    await user.click(screen.getByRole('button', { name: /escolher outra reação/i }));
    await user.click(screen.getByRole('button', { name: /posso ajudar/i }));

    expect(onReact).toHaveBeenCalledExactlyOnceWith('offerHelp');
  });

  it('fecha a fileira com Escape, para não prender quem usa teclado', async () => {
    const user = userEvent.setup();
    render(<ReactionBar counts={{}} mine={null} onReact={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /escolher outra reação/i }));
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
