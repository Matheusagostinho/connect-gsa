import type {
  Comment,
  FeedPage,
  FeedTab,
  MyProfile,
  Post,
  Reaction,
  UploadResult,
} from '@connect-gsa/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api, upload } from './api.js';

export const FEED_KEY = ['feed'] as const;

export function useFeed(tab: FeedTab) {
  return useInfiniteQuery({
    // A aba entra na chave: cada uma tem o próprio cache, então alternar não
    // rebusca o que já foi carregado nem mistura os resultados das duas.
    queryKey: [...FEED_KEY, tab],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ tab });
      if (pageParam) params.set('cursor', pageParam);
      return api.get<FeedPage>(`/feed?${params.toString()}`);
    },
    getNextPageParam: (last: FeedPage) => last.nextCursor ?? undefined,
  });
}

/** Aplica uma mudança a um post dentro do cache paginado, sem refazer o feed. */
function patchPost(
  data: InfiniteData<FeedPage, string | undefined> | undefined,
  postId: string,
  patch: (post: Post) => Post,
): InfiniteData<FeedPage, string | undefined> | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.id === postId ? patch(post) : post)),
    })),
  };
}

/**
 * Reagir a um post.
 *
 * Sem atualização otimista de propósito: a regra "trocar substitui, repetir
 * desfaz" tem três resultados possíveis, e adivinhar qual deles aconteceu no
 * cliente é como a contagem começa a divergir do banco. A resposta do servidor
 * já traz a contagem final — é ela que manda.
 */
export function useReact(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reaction: Reaction) =>
      api.post<Pick<Post, 'reactionCounts' | 'myReaction'>>(`/posts/${postId}/reaction`, {
        reaction,
      }),
    onSuccess: (resultado) => {
      // As duas abas podem ter o mesmo post em cache; a reação precisa alcançar
      // ambas, senão trocar de aba mostra a contagem antiga.
      for (const tab of ['forYou', 'following'] as const) {
        queryClient.setQueryData<InfiniteData<FeedPage, string | undefined>>(
          [...FEED_KEY, tab],
          (data) => patchPost(data, postId, (post) => ({ ...post, ...resultado })),
        );
      }
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { content: string; mediaKey?: string }) =>
      api.post<Post>('/posts', input),
    onSuccess: async () => {
      // O post novo precisa ser reposicionado pelo ranking, não empurrado no
      // topo pelo cliente — refazer o feed é o que mantém a tela honesta.
      await queryClient.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.remove(`/posts/${postId}`),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

export function useComments(postId: string, enabled: boolean) {
  const queryClient = useQueryClient();

  const list = useMutation({
    mutationFn: () => api.get<Comment[]>(`/posts/${postId}/comments`),
  });

  const create = useMutation({
    mutationFn: (content: string) => api.post<Comment[]>(`/posts/${postId}/comments`, { content }),
    onSuccess: (comments) => {
      for (const tab of ['forYou', 'following'] as const) {
        queryClient.setQueryData<InfiniteData<FeedPage, string | undefined>>(
          [...FEED_KEY, tab],
          (data) => patchPost(data, postId, (post) => ({ ...post, commentCount: comments.length })),
        );
      }
    },
  });

  return { list, create, enabled };
}

export function uploadPostImage(file: File): Promise<UploadResult> {
  return upload<UploadResult>('/media/post-image', file);
}

export function uploadAvatar(file: File): Promise<MyProfile> {
  return upload<MyProfile>('/media/avatar', file);
}
