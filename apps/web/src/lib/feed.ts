import type { Comment, FeedPage, MyProfile, Post, Reaction, UploadResult } from '@connect-gsa/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api, upload } from './api.js';

export const FEED_KEY = ['feed'] as const;

export function useFeed() {
  return useInfiniteQuery({
    queryKey: FEED_KEY,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<FeedPage>(pageParam ? `/feed?cursor=${encodeURIComponent(pageParam)}` : '/feed'),
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
      queryClient.setQueryData<InfiniteData<FeedPage, string | undefined>>(FEED_KEY, (data) =>
        patchPost(data, postId, (post) => ({ ...post, ...resultado })),
      );
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
      queryClient.setQueryData<InfiniteData<FeedPage, string | undefined>>(FEED_KEY, (data) =>
        patchPost(data, postId, (post) => ({ ...post, commentCount: comments.length })),
      );
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
