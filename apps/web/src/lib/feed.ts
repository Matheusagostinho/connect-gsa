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
import { aplicarReacao } from './reacao-otimista.js';
import { useToast } from '../components/Toast.tsx';

export const FEED_KEY = ['feed'] as const;

/** As duas abas guardam o mesmo post; toda escrita precisa alcançar as duas. */
const ABAS = ['forYou', 'following'] as const;

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
 * Aplicada NA HORA, e desfeita se o servidor recusar.
 *
 * Havia aqui uma decisão contrária, com a justificativa de que "a regra tem três
 * resultados possíveis e adivinhar qual deles aconteceu é como a contagem
 * diverge do banco". A preocupação era certa; a premissa, não: os três
 * resultados são determinísticos a partir do que a tela já sabe, e agora moram
 * numa função pura com teste para cada caminho (`reacao-otimista.ts`).
 *
 * A divergência continua impossível por outro motivo: a resposta do servidor
 * traz a contagem final e sobrescreve o cálculo. O otimismo só antecipa o que
 * viria — e se algum dia os dois discordarem, quem vale é o servidor.
 *
 * O `onError` devolve o cache exatamente como estava. Desfazer em silêncio seria
 * pior que a espera que isto substitui: a pessoa veria o próprio toque sendo
 * revertido sem explicação. Daí o aviso junto.
 */
export function useReact(postId: string) {
  const queryClient = useQueryClient();
  const { avisar } = useToast();

  return useMutation({
    mutationFn: (reaction: Reaction) =>
      api.post<Pick<Post, 'reactionCounts' | 'myReaction'>>(`/posts/${postId}/reaction`, {
        reaction,
      }),

    onMutate: async (reaction: Reaction) => {
      // Cancelar antes de mexer: uma busca em voo terminaria depois e
      // sobrescreveria o valor otimista com o estado anterior do servidor.
      await queryClient.cancelQueries({ queryKey: FEED_KEY });

      const anterior = ABAS.map(
        (tab) => [tab, queryClient.getQueryData([...FEED_KEY, tab])] as const,
      );

      for (const tab of ABAS) {
        queryClient.setQueryData<InfiniteData<FeedPage, string | undefined>>(
          [...FEED_KEY, tab],
          (data) => patchPost(data, postId, (post) => aplicarReacao(post, reaction)),
        );
      }

      return { anterior };
    },

    onError: (_erro, _reaction, contexto) => {
      for (const [tab, dados] of contexto?.anterior ?? []) {
        queryClient.setQueryData([...FEED_KEY, tab], dados);
      }
      avisar('Não deu para registrar sua reação. Tente de novo.');
    },

    onSuccess: (resultado) => {
      // As duas abas podem ter o mesmo post em cache; a reação precisa alcançar
      // ambas, senão trocar de aba mostra a contagem antiga.
      for (const tab of ABAS) {
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

/**
 * Apagar tira da lista NA HORA.
 *
 * É a ação que mais incomoda esperar: a pessoa já decidiu, e ver a própria
 * publicação parada na tela por um segundo faz parecer que o toque não pegou —
 * e ela toca de novo.
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  const { avisar } = useToast();

  return useMutation({
    mutationFn: (postId: string) => api.remove(`/posts/${postId}`),

    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: FEED_KEY });

      const anterior = ABAS.map(
        (tab) => [tab, queryClient.getQueryData([...FEED_KEY, tab])] as const,
      );

      for (const tab of ABAS) {
        queryClient.setQueryData<InfiniteData<FeedPage, string | undefined>>(
          [...FEED_KEY, tab],
          (data) =>
            data && {
              ...data,
              pages: data.pages.map((pagina) => ({
                ...pagina,
                posts: pagina.posts.filter((post) => post.id !== postId),
              })),
            },
        );
      }

      return { anterior };
    },

    onError: (_erro, _postId, contexto) => {
      for (const [tab, dados] of contexto?.anterior ?? []) {
        queryClient.setQueryData([...FEED_KEY, tab], dados);
      }
      avisar('Não deu para apagar a publicação. Ela continua no ar.');
    },

    // Refaz mesmo tendo dado certo: apagar muda a paginação do ranking, e o
    // cliente não tem como saber qual post sobe para o lugar que vagou.
    onSettled: async () => queryClient.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

export function useComments(postId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const { avisar } = useToast();

  const list = useMutation({
    mutationFn: () => api.get<Comment[]>(`/posts/${postId}/comments`),
  });

  const create = useMutation({
    mutationFn: (content: string) => api.post<Comment[]>(`/posts/${postId}/comments`, { content }),

    // Só a CONTAGEM sobe de forma otimista, não o comentário na lista: o texto
    // passa por sanitização no servidor, e mostrar o que a pessoa digitou para
    // trocá-lo depois seria pior que mostrar um instante mais tarde.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: FEED_KEY });

      const anterior = ABAS.map(
        (tab) => [tab, queryClient.getQueryData([...FEED_KEY, tab])] as const,
      );

      for (const tab of ABAS) {
        queryClient.setQueryData<InfiniteData<FeedPage, string | undefined>>(
          [...FEED_KEY, tab],
          (data) =>
            patchPost(data, postId, (post) => ({
              ...post,
              commentCount: post.commentCount + 1,
            })),
        );
      }

      return { anterior };
    },

    onError: (_erro, _content, contexto) => {
      for (const [tab, dados] of contexto?.anterior ?? []) {
        queryClient.setQueryData([...FEED_KEY, tab], dados);
      }
      avisar('Não deu para publicar seu comentário. Tente de novo.');
    },

    onSuccess: (comments) => {
      for (const tab of ABAS) {
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
