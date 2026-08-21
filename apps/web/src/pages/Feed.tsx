import type { FeedTab } from '@connect-gsa/shared';
import { useState } from 'react';
import { AppShell } from '../components/AppShell.tsx';
import { Composer } from '../components/Composer.tsx';
import { FeedTabs } from '../components/FeedTabs.tsx';

/**
 * As abas do feed aparecem?
 *
 * **Desligadas enquanto a rede é pequena**, a pedido do dono do produto. Com
 * poucas pessoas, "Seguindo" fica quase vazia e a escolha entre as duas não tem
 * consequência — vira uma pergunta que a tela faz sem ter resposta útil.
 *
 * "Para você" continua sendo o que todo mundo vê, e ela nunca filtrou nada: a
 * afinidade entra como impulso no ranking, nunca como cláusula de busca
 * (AC-099). Ou seja, com as abas escondidas, todo mundo vê a rede inteira — que
 * é exatamente o que se quer no começo.
 *
 * **Para voltar:** troque para `true`. Nada mais precisa mudar — a busca por aba
 * continua no lugar, com o teste dela, e o servidor nunca soube desta decisão.
 */
const MOSTRAR_ABAS = false;
import { NewPostButton } from '../components/NewPostButton.tsx';
import { PostCard } from '../components/PostCard.tsx';
import { PullToRefresh } from '../components/PullToRefresh.tsx';
import { Button, UnofficialNotice } from '../components/ui.tsx';
import { useFeed } from '../lib/feed.js';
import { useMyProfile } from '../lib/session.js';
import { PostSkeleton, SkeletonList } from '../components/Skeleton.tsx';

export function FeedPage() {
  const { data: profile } = useMyProfile();
  const [aba, setAba] = useState<FeedTab>('forYou');
  const { data, isPending, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, error } =
    useFeed(aba);

  if (!profile) return null;

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <AppShell
      profile={profile}
      rail
      {...(MOSTRAR_ABAS ? { tabs: <FeedTabs atual={aba} onChange={setAba} /> } : {})}
    >
      <PullToRefresh onRefresh={() => refetch()}>
        <Composer authorName={profile.name} authorImage={profile.imageUrl} />

        {/*
          Contorno em vez de "Carregando o feed…": o texto centralizado some e é
          substituído por uma tela cheia, e o salto move o que a pessoa já estava
          olhando. O contorno ocupa o espaço final desde o primeiro quadro.
        */}
        {isPending ? (
          <SkeletonList quantidade={3} rotulo="Carregando o feed">
            {() => <PostSkeleton />}
          </SkeletonList>
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
