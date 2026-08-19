import type { MapCity } from '@connect-gsa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CityModal } from './CityModal.tsx';

const CIDADE: MapCity = {
  cityId: '11111111-1111-4111-8111-111111111111',
  city: 'Pirapora',
  state: 'MG',
  latitude: -17.34,
  longitude: -44.94,
  count: 2,
  preview: [],
};

const PESSOAS = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'ana-ribeiro',
    name: 'Ana Ribeiro',
    imageUrl: null,
    course: 'Engenharia',
    institution: 'IFNMG — Pirapora',
    city: 'Pirapora/MG',
    skills: [],
    connection: 'none' as const,
  },
];

beforeAll(() => {
  // jsdom conhece o elemento `dialog`, mas não implementa `showModal`/`close`.
  // Sem estes dois, o teste falharia por limitação do ambiente e não por defeito
  // do componente — que é justamente o que um teste não deve fazer.
  HTMLDialogElement.prototype.showModal = function abrir(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function fechar(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

function renderModal(city: MapCity | null, onClose = vi.fn()) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(PESSOAS),
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CityModal city={city} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { onClose };
}

describe('modal da cidade', () => {
  it('não abre nada enquanto nenhuma cidade foi tocada', () => {
    renderModal(null);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('abre com quem está naquela cidade @spec:AC-103', async () => {
    renderModal(CIDADE);

    expect(screen.getByRole('dialog')).toHaveProperty('open', true);
    expect(screen.getByRole('heading', { name: 'Pirapora/MG' })).toBeInTheDocument();
    expect(await screen.findByText('Ana Ribeiro')).toBeInTheDocument();
  });

  it('usa `dialog` nativo, para o mapa atrás sair do alcance do teclado @spec:AC-103', () => {
    renderModal(CIDADE);

    // A escolha do elemento é o que traz foco preso, Escape e ocultação do
    // resto da página. Uma `div` estilizada de modal não traz nada disso.
    expect(screen.getByRole('dialog').tagName).toBe('DIALOG');
  });

  it('fecha pelo botão, devolvendo o mapa inteiro', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal(CIDADE);

    await user.click(screen.getByRole('button', { name: /fechar/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('concorda em português com o número de pessoas', () => {
    renderModal({ ...CIDADE, count: 1 });

    expect(screen.getByText('1 embaixador')).toBeInTheDocument();
  });
});
