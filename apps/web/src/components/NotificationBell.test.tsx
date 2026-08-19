import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell.tsx';

const ATOR = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'bruno-lima',
  name: 'Bruno Lima',
  imageUrl: null,
};

function notificacao(id: string, kind: string) {
  return {
    id,
    kind,
    actor: ATOR,
    post: null,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

/**
 * As respostas são montadas por rota porque o sino usa DUAS consultas com ciclos
 * diferentes: o contador acompanha a navegação inteira, a lista só é buscada
 * quando a caixa abre. Devolver o mesmo corpo às duas esconderia justamente
 * essa separação.
 */
function renderSino({ unreadCount = 0, notifications = [] as ReturnType<typeof notificacao>[] } = {}) {
  const marcarVisto = vi.fn();

  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      const caminho = String(url);
      if (caminho.endsWith('/notifications/seen')) {
        marcarVisto(init?.method);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
      }
      if (caminho.endsWith('/notifications/count')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ unreadCount }) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ notifications, nextCursor: null }),
      });
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { marcarVisto };
}

describe('sino de notificações', () => {
  it('abre a caixa com as recentes sem sair da página @spec:AC-100', async () => {
    const user = userEvent.setup();
    renderSino({ unreadCount: 2, notifications: [notificacao('a', 'connectionAccepted')] });

    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: /notificações/i }));

    const caixa = await screen.findByRole('dialog', { name: /notificações recentes/i });
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument();
    expect(within(caixa).getByText(/aceitou seu pedido/i)).toBeInTheDocument();
  });

  it('leva para a página inteira pelo link "ver todas"', async () => {
    const user = userEvent.setup();
    renderSino();

    await user.click(screen.getByRole('button', { name: /notificações/i }));

    const link = await screen.findByRole('link', { name: /ver todas/i });
    expect(link).toHaveAttribute('href', '/notificacoes');
  });

  it('mostra no máximo cinco — a caixa é um resumo, não a lista toda', async () => {
    const user = userEvent.setup();
    const muitas = Array.from({ length: 8 }, (_, i) => notificacao(`n${i}`, 'reaction'));
    renderSino({ unreadCount: 8, notifications: muitas });

    await user.click(screen.getByRole('button', { name: /notificações/i }));

    const caixa = await screen.findByRole('dialog', { name: /notificações recentes/i });
    await screen.findAllByText('Bruno Lima');
    expect(within(caixa).getAllByText(/reagiu à sua publicação/i)).toHaveLength(5);
  });

  it('zera o contador ao abrir, porque abrir a caixa é olhar', async () => {
    const user = userEvent.setup();
    const { marcarVisto } = renderSino({ unreadCount: 3 });

    expect(await screen.findByRole('button', { name: /3 não lidas/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /notificações/i }));

    await vi.waitFor(() => expect(marcarVisto).toHaveBeenCalledWith('POST'));
  });

  it('não marca nada como visto quando não há o que marcar', async () => {
    const user = userEvent.setup();
    const { marcarVisto } = renderSino({ unreadCount: 0 });

    await user.click(screen.getByRole('button', { name: /notificações/i }));
    await screen.findByRole('dialog', { name: /notificações recentes/i });

    expect(marcarVisto).not.toHaveBeenCalled();
  });

  it('fecha com Escape, para o teclado não ficar preso na caixa', async () => {
    const user = userEvent.setup();
    renderSino({ notifications: [notificacao('a', 'comment')] });

    await user.click(screen.getByRole('button', { name: /notificações/i }));
    await screen.findByRole('dialog', { name: /notificações recentes/i });

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
