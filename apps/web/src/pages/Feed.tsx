import type { FeedTab } from '@connect-gsa/shared';
import { useState } from 'react';
import { AppShell } from '../components/AppShell.tsx';
import { Composer } from '../components/Composer.tsx';
import { FeedTabs } from '../components/FeedTabs.tsx';
import { NewPostButton } from '../components/NewPostButton.tsx';
import { PostCard } from '../components/PostCard.tsx';
import { PullToRefresh } from '../components/PullToRefresh.tsx';
import { Button, UnofficialNotice } from '../components/ui.tsx';
import { useFeed } from '../lib/feed.js';
import { useMyProfile } from '../lib/session.js';

export function FeedPage() {
  const { data: profile } = useMyProfile();
  const [aba, setAba] = useState<FeedTab>('forYou');
  const { data, isPending, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, error } =
    useFeed(aba);

  if (!profile) return null;

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <AppShell profile={profile} rail tabs={<FeedTabs atual={aba} onChange={setAba} />}>
      <PullToRefresh onRefresh={() => refetch()}>
        <Composer authorName={profile.name} authorImage={profile.imageUrl} />

        {isPending ? (
          <p className="py-8 text-center text-ink-muted" role="status">
            Carregando o feed…
          </p>
        ) : null}

        {error instanceof Error ? (
          <p role="alert" className="p-5 text-sm font-medium text-danger">
            {error.message}
          </p>
        ) : null}

        {!isPending && posts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h2 className="display text-2xl">
              {aba === 'following' ? 'Nada das suas conexões' : 'Silêncio por aqui'}
            </h2>
            <p className="mt-2 text-ink-muted">
              {aba === 'following'
                ? 'Conecte com mais gente no diretório, ou volte para “Para você”.'
                : 'Seja a primeira pessoa a contar o que está construindo.'}
            </p>
          </div>
        ) : null}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {hasNextPage ? (
          <div className="flex justify-center p-5">
            <Button
              variant="outline"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
            </Button>
          </div>
        ) : null}
      </PullToRefresh>

      <UnofficialNotice className="mt-10 mb-6" />

      <NewPostButton />
    </AppShell>
  );
}
