import { Link } from 'react-router';
import { AccountMenu } from '../components/AccountMenu.tsx';
import { Composer } from '../components/Composer.tsx';
import { PostCard } from '../components/PostCard.tsx';
import { Button, Card, Shell, UnofficialNotice, Wordmark } from '../components/ui.tsx';
import { useFeed } from '../lib/feed.js';
import { useMyProfile } from '../lib/session.js';

export function FeedPage() {
  const { data: profile } = useMyProfile();
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, error } = useFeed();

  if (!profile) return null;

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <Shell width="lg">
      <header className="mb-8 flex items-center justify-between">
        <Link to="/" aria-label="ConnectGSA">
          <Wordmark />
        </Link>
        <AccountMenu profile={profile} />
      </header>

      <Composer authorName={profile.name} authorImage={profile.imageUrl} />

      <div className="mt-4 flex flex-col gap-4">
        {isPending ? (
          <p className="py-8 text-center text-ink-muted" role="status">
            Carregando o feed…
          </p>
        ) : null}

        {error instanceof Error ? (
          <Card>
            <p role="alert" className="text-sm font-medium text-danger">
              {error.message}
            </p>
          </Card>
        ) : null}

        {!isPending && posts.length === 0 ? (
          <Card className="text-center">
            <h2 className="display text-2xl">Silêncio por aqui</h2>
            <p className="mt-2 text-ink-muted">
              Seja a primeira pessoa a contar o que está construindo.
            </p>
          </Card>
        ) : null}

        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {hasNextPage ? (
          <Button
            variant="outline"
            className="mx-auto"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? 'Carregando…' : 'Ver mais'}
          </Button>
        ) : null}
      </div>

      <UnofficialNotice className="mt-16" />
    </Shell>
  );
}
