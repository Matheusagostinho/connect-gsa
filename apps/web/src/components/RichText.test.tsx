import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from './RichText.tsx';

describe('texto com links', () => {
  it('transforma endereço em link clicável, que abre em outra aba @spec:AC-080', () => {
    render(<RichText text="Olha isso: https://connectgsa.web.app/mapa" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://connectgsa.web.app/mapa');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('completa o protocolo de endereço escrito sem ele', () => {
    render(<RichText text="veja www.google.com/search" />);

    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://www.google.com/search');
  });

  it('encurta endereço comprido sem perder o destino @spec:AC-081', () => {
    const longa =
      'https://www.google.com/search?q=mascote+blip&sca_esv=19d038241e14d62e&udm=2&biw=1536&bih=730';

    render(<RichText text={longa} />);

    const link = screen.getByRole('link');
    // O endereço inteiro empurraria o cartão e dominaria a publicação.
    expect(link.textContent?.length ?? 0).toBeLessThan(48);
    expect(link).toHaveAttribute('href', longa);
    expect(link).toHaveAttribute('title', longa);
  });

  it('mantém o texto ao redor do link', () => {
    render(<RichText text="antes https://exemplo.com depois" />);

    expect(screen.getByText(/antes/)).toBeInTheDocument();
    expect(screen.getByText(/depois/)).toBeInTheDocument();
  });

  it('não cria link onde não há endereço', () => {
    render(<RichText text="isso é só um texto com ponto final." />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('mantém marcação como texto, sem virar elemento @spec:AC-082 @principle:P-006', () => {
    // O conteúdo já chega sanitizado do servidor; ainda assim, o React escapa
    // por construção — e é isso que este teste protege de uma "melhoria" futura
    // com dangerouslySetInnerHTML.
    render(<RichText text="<img src=x onerror=alert(1)>" />);

    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });

  it('não confunde e-mail com endereço de site', () => {
    render(<RichText text="fale com ana@www.uni.br" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
