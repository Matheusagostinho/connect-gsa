import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMyProfile } from '../lib/session.js';

/**
 * Para onde a RAIZ manda cada pessoa.
 *
 * Este teste nasceu de uma regressão que eu mesmo introduzi: o `callbackURL` do
 * login deixou de apontar para `/onboarding` — certo, porque quem já tem perfil
 * não deve passar pela tela de apresentação a cada entrada — e a decisão passou
 * a ser da rota raiz. Só que ela decidia entre feed e apresentação **sem nunca
 * olhar `profileComplete`**, e quem acabava de entrar caía num feed vazio.
 *
 * Sem cidade não há mapa e sem instituição não há diretório: o onboarding não é
 * formalidade, é o que torna a rede utilizável para quem chegou.
 */
vi.mock('../lib/session.js', () => ({ useMyProfile: vi.fn() }));

/** A mesma decisão da raiz, isolada do resto da árvore. */
function Raiz() {
  const { data: profile, isPending } = useMyProfile();
  if (isPending) return <p>Carregando…</p>;
  if (!profile) return <p>apresentação</p>;
  if (!profile.profileComplete) return <Navigate to="/onboarding" replace />;
  return <p>feed</p>;
}

function montar(perfil: unknown, isPending = false) {
  vi.mocked(useMyProfile).mockReturnValue({
    data: perfil,
    isPending,
  } as ReturnType<typeof useMyProfile>);

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Raiz />} />
          <Route path="/onboarding" element={<p>onboarding</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe('destino da raiz', () => {
  it('sem sessão, mostra a apresentação', () => {
    montar(null);
    expect(screen.getByText('apresentação')).toBeInTheDocument();
  });

  it('PRIMEIRO login (perfil incompleto) vai para o onboarding', () => {
    // Era isto que estava quebrado: caía direto no feed, sem cidade cadastrada.
    montar({ profileComplete: false });
    expect(screen.getByText('onboarding')).toBeInTheDocument();
  });

  it('logins seguintes (perfil completo) vão para o início', () => {
    // E isto é o que a mudança do `callbackURL` veio resolver: quem já tem
    // perfil não passa pela tela de apresentação a cada entrada.
    montar({ profileComplete: true });
    expect(screen.getByText('feed')).toBeInTheDocument();
  });
});
