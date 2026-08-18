import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute.tsx';

const perfilCompleto = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana',
  profileComplete: true,
};

function renderRoute(resposta: { status: number; body: unknown }, initial = '/perfil'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: resposta.status < 400,
      status: resposta.status,
      json: () => Promise.resolve(resposta.body),
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = (element: ReactElement) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/entrar" element={<p>tela de login</p>} />
          <Route path="/onboarding" element={<p>complete seu perfil</p>} />
          <Route path="/perfil" element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  render(wrap(<ProtectedRoute>{<p>área restrita</p>}</ProtectedRoute>));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rota protegida', () => {
  it('manda para o login quem não tem sessão', async () => {
    renderRoute({ status: 401, body: { code: 'UNAUTHORIZED', message: 'Autenticação necessária.' } });

    expect(await screen.findByText('tela de login')).toBeInTheDocument();
    expect(screen.queryByText('área restrita')).not.toBeInTheDocument();
  });

  it('empurra para o onboarding enquanto o perfil estiver incompleto @spec:AC-009', async () => {
    renderRoute({ status: 200, body: { ...perfilCompleto, profileComplete: false } });

    expect(await screen.findByText('complete seu perfil')).toBeInTheDocument();
    expect(screen.queryByText('área restrita')).not.toBeInTheDocument();
  });

  it('deixa passar quem tem sessão e perfil completo', async () => {
    renderRoute({ status: 200, body: perfilCompleto });

    expect(await screen.findByText('área restrita')).toBeInTheDocument();
  });
});
