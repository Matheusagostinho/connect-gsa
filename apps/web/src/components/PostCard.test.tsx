import type { Post } from '@connect-gsa/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostCard } from './PostCard.tsx';
import { FEED_KEY } from '../lib/feed.js';

const POST: Post = {
  id: '44444444-4444-4444-8444-444444444444',
  kind: 'feed',
  content: 'Terminei o protótipo',
  mediaUrl: null,
  createdAt: new Date().toISOString(),
  author: {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'bruno-lima',
    name: 'Bruno Lima',
    imageUrl: null,
    course: 'Sistemas',
    institutionAcronym: 'IFNMG',
    connection: 'none',
  },
  reactionCounts: {},
  myReaction: null,
  commentCount: 0,
  canDelete: false,
  canModerate: false,
};

function renderCartao() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ connection: 'pendingSent' }),
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  // Uma página de feed no cache, com este post: é ela que precisa mudar quando
  // o pedido de conexão sai.
  client.setQueryData([...FEED_KEY, 'forYou'], {
    pageParams: [undefined],
    pages: [{ posts: [POST], nextCursor: null }],
  });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PostCard post={POST} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { client };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cartão de publicação', () => {
  it('conectar pelo cartão atualiza o feed em cache @spec:AC-129', async () => {
    const user = userEvent.setup();
    const { client } = renderCartao();

    await user.click(screen.getByRole('button', { name: 'Conectar' }));

    // O botão não mostrava nada ao ser tocado porque a lista de caches
    // invalidados não incluía o feed: a publicação em cache continuava dizendo
    // `connection: 'none'`, e o cartão nunca sabia que o pedido saiu.
    await vi.waitFor(() => {
      const dados = client.getQueryData<{ pages: { posts: Post[] }[] }>([...FEED_KEY, 'forYou']);
      expect(dados?.pages[0]?.posts[0]?.author.connection).toBe('pendingSent');
    });
  });

  it('não oferece conectar a quem já é conexão', () => {
    vi.stubGlobal('fetch', vi.fn());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PostCard post={{ ...POST, author: { ...POST.author, connection: 'connected' } }} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Conectar' })).not.toBeInTheDocument();
  });
});
