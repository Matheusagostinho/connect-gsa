import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell.tsx';
import { DESTINOS } from '../lib/navigation.js';

const perfil = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'ana-ribeiro',
  name: 'Ana Ribeiro',
  imageUrl: null,
  role: 'ambassador' as const,
  course: 'Engenharia',
  bio: '',
  skills: [],
  links: [],
  institution: null,
  city: null,
  visibleOnMap: false,
  profileComplete: true,
  createdAt: new Date().toISOString(),
  connection: 'self' as const,
};

function renderShell(unreadCount = 0, rota = '/') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ unreadCount }),
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <AppShell profile={perfil}>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('moldura do aplicativo', () => {
  it('oferece os destinos principais nas duas navegações @spec:AC-061 @spec:AC-062', () => {
    renderShell();

    // Duas navegações no documento: a lateral do computador e a inferior do
    // celular. Qual delas aparece é decidido pelo CSS, não pelo JavaScript —
    // então as duas existem, e o teste checa que nenhum destino ficou de fora.
    const navegacoes = screen.getAllByRole('navigation', { name: 'Seções' });
    expect(navegacoes).toHaveLength(2);

    const [lateral, inferior] = navegacoes;

    for (const destino of DESTINOS) {
      expect(within(lateral!).getByRole('link', { name: new RegExp(destino.label, 'i') })).toBeInTheDocument();
    }

    for (const destino of DESTINOS.filter((d) => d.mobile)) {
      expect(within(inferior!).getByRole('link', { name: destino.label })).toBeInTheDocument();
    }
  });

  it('marca a seção atual para quem vê e para quem ouve @spec:AC-063', () => {
    renderShell(0, '/mapa');

    const atuais = screen.getAllByRole('link', { current: 'page' });

    expect(atuais.length).toBeGreaterThan(0);
    expect(atuais.every((l) => /mapa/i.test(l.textContent ?? ''))).toBe(true);
  });

  it('mostra quantas notificações estão por ler @spec:AC-066', async () => {
    renderShell(3);

    expect(await screen.findAllByText('3')).not.toHaveLength(0);
    expect(screen.getAllByText(/3 não lidas/)).not.toHaveLength(0);
  });

  it('não mostra contador quando não há nada por ler', async () => {
    renderShell(0);

    // Espera o contador chegar antes de concluir que ele não aparece.
    await screen.findAllByRole('navigation', { name: 'Seções' });
    expect(screen.queryByText(/não lida/)).not.toBeInTheDocument();
  });

  it('mostra o conteúdo da página', () => {
    renderShell();

    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });
});
