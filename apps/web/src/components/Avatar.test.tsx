import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar.tsx';

describe('avatar', () => {
  it('recua para a inicial quando a foto não carrega', () => {
    const { container } = render(
      <Avatar name="Carla Nogueira" imageUrl="https://exemplo.test/sumiu.jpg" />,
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();

    fireEvent.error(img!);

    // Um arquivo que sumiu do armazenamento virava o ícone de imagem quebrada do
    // navegador — pior que não ter foto, porque parece defeito do produto.
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('mostra a inicial quando não há foto', () => {
    render(<Avatar name="ana ribeiro" imageUrl={null} />);

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('o anel em degradê envolve a foto sem cobri-la', () => {
    const { container } = render(<Avatar name="Ana" imageUrl={null} size={88} ring />);

    // O degradê é o elemento de FORA; um `border-image` circular não existe em
    // CSS e `outline` não aceita gradiente.
    expect(container.firstElementChild?.className).toContain('spark-gradient');
    expect(container.querySelector('.spark-gradient .spark-gradient')).not.toBeNull();
  });

  it('sem anel, o avatar é o próprio elemento', () => {
    const { container } = render(<Avatar name="Ana" imageUrl={null} size={44} />);

    expect(container.children).toHaveLength(1);
  });
});
