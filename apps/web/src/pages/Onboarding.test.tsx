import type { MyProfile } from '@connect-gsa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from './Onboarding.tsx';

const PERFIL: MyProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'ana-ribeiro',
  name: 'Ana Ribeiro',
  imageUrl: null,
  role: 'ambassador',
  course: 'Ciência da Computação',
  bio: '',
  skills: [],
  links: [],
  institution: null,
  city: null,
  visibleOnMap: false,
  profileComplete: false,
  createdAt: '2026-08-01T12:00:00.000Z',
  connection: 'self',
  connectionCount: 0,
  postCount: 0,
};

function renderOnboarding(profileComplete: boolean) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const caminho = String(url);
      if (caminho.includes('/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ...PERFIL, profileComplete }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('formulário do perfil', () => {
  it('editar acontece dentro da moldura do aplicativo @spec:AC-106', async () => {
    renderOnboarding(true);

    expect(await screen.findAllByRole('navigation', { name: 'Seções' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('o primeiro preenchimento não oferece navegação que só recusa @spec:AC-107', async () => {
    renderOnboarding(false);

    // O `ProtectedRoute` devolve para cá quem tem perfil incompleto e tenta
    // qualquer outra seção. Oferecer os destinos seria oferecer uma porta que
    // se fecha na cara de quem a abre.
    expect(await screen.findByRole('heading', { name: /complete seu perfil/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Seções' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar e continuar' })).toBeInTheDocument();
  });
});
