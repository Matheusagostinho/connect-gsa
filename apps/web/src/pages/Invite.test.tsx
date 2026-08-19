import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InvitePage } from './Invite.tsx';

function renderCom(rota: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/convite" element={<InvitePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('tela de convite', () => {
  it('preenche o código quando a pessoa chega pelo link @spec:AC-060', () => {
    const codigo = 'a'.repeat(32);

    renderCom(`/convite?c=${codigo}`);

    // Quem recebeu o link no grupo não deveria ter que copiar nada à mão.
    expect(screen.getByLabelText(/código do convite/i)).toHaveValue(codigo);
  });

  it('começa vazio quando a pessoa chega sem link', () => {
    renderCom('/convite');

    expect(screen.getByLabelText(/código do convite/i)).toHaveValue('');
  });

  it('avisa quando o código não tem o formato esperado', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    renderCom('/convite');
    await user.type(screen.getByLabelText(/código do convite/i), 'codigo-curto');
    await user.click(screen.getByRole('button', { name: /continuar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/32 caracteres/i);
  });
});
