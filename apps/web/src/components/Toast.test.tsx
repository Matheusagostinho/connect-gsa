import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './Toast.tsx';

function Botao() {
  const { avisar } = useToast();
  return (
    <button type="button" onClick={() => avisar('deu ruim')}>
      disparar
    </button>
  );
}

describe('aviso curto', () => {
  it('aparece só depois de disparado, e é anunciado', async () => {
    render(
      <ToastProvider>
        <Botao />
      </ToastProvider>,
    );

    expect(screen.queryByText('deu ruim')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'disparar' }));

    expect(await screen.findByText('deu ruim')).toBeInTheDocument();
    // `assertive` no erro: é algo que a pessoa precisa saber que NÃO aconteceu.
    expect(screen.getByText('deu ruim').closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'assertive',
    );
  });

  it('fora do provedor, avisar não quebra a tela', async () => {
    // Um componente usado em teste isolado não deve falhar por causa de uma
    // decoração ausente. Lançar aqui transformaria isso em erro de renderização.
    render(<Botao />);

    await userEvent.click(screen.getByRole('button', { name: 'disparar' }));

    expect(screen.getByRole('button', { name: 'disparar' })).toBeInTheDocument();
  });
});
