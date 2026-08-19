import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InvitePage } from './Invite.tsx';
import { lerConvite } from '../lib/invite-guardado.js';

const CODIGO = 'ABC5EK9M';

function renderConvite(rota: string, resposta: { ok: boolean; corpo: unknown }) {
  const chamadas: string[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      chamadas.push(`${init?.method ?? 'GET'} ${String(url)}`);
      if (String(url).includes('/invites/check')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
      }
      return Promise.resolve({
        ok: resposta.ok,
        status: resposta.ok ? 200 : 400,
        json: () => Promise.resolve(resposta.corpo),
      });
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/convite" element={<InvitePage />} />
          <Route path="/convite/:code" element={<InvitePage />} />
          <Route path="/entrar" element={<p>tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { chamadas };
}

const valido = {
  ok: true,
  corpo: { invitedBy: 'Ana', expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
};

const recusado = {
  ok: false,
  corpo: { code: 'INVITE_REJECTED', message: 'Convite inválido, expirado ou já utilizado.' },
};

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('página do convite', () => {
  it('cumprimenta dizendo quem convidou @spec:AC-135', async () => {
    renderConvite(`/convite/${CODIGO}`, valido);

    expect(await screen.findByText(/te convidou/i)).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar para o login/i })).toBeInTheDocument();
  });

  it('não pede o código que já está no endereço @spec:AC-134 @spec:AC-060', async () => {
    renderConvite(`/convite/${CODIGO}`, valido);

    await screen.findByText(/te convidou/i);
    // Pedir que a pessoa digite o que já está na barra de endereço era trabalho
    // inventado.
    expect(screen.queryByLabelText(/código do convite/i)).not.toBeInTheDocument();
  });

  it('guarda o código para ele sobreviver ao login social @spec:AC-137', async () => {
    renderConvite(`/convite/${CODIGO}`, valido);

    await screen.findByText(/te convidou/i);

    // O provedor social devolve a pessoa numa navegação nova; sem guardar, o
    // código da barra de endereço se perde no caminho.
    await vi.waitFor(() => expect(lerConvite()).toBe(CODIGO));
  });

  it('recusa sem revelar nada e oferece digitar outro @spec:AC-136', async () => {
    renderConvite(`/convite/${CODIGO}`, recusado);

    expect(await screen.findByRole('heading', { name: /convite não encontrado/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/código do convite/i)).toBeInTheDocument();
    expect(lerConvite()).toBeNull();
  });

  it('aceita o código digitado à mão, em minúsculas', async () => {
    const user = userEvent.setup();
    const { chamadas } = renderConvite('/convite', valido);

    await user.type(screen.getByLabelText(/código do convite/i), CODIGO.toLowerCase());
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    await vi.waitFor(() =>
      expect(chamadas.some((c) => c.includes('/invites/check'))).toBe(true),
    );
    // O código circula por conversa e chega digitado de todo jeito.
    await vi.waitFor(() => expect(lerConvite()).toBe(CODIGO));
  });

  it('recusa um código malformado antes de chamar a API', async () => {
    const user = userEvent.setup();
    const { chamadas } = renderConvite('/convite', valido);

    await user.type(screen.getByLabelText(/código do convite/i), 'ABC');
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/8 caracteres/i);
    expect(chamadas.some((c) => c.includes('/invites/check'))).toBe(false);
  });
});
