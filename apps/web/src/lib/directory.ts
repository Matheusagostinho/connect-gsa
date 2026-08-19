import type {
  AmbassadorCard,
  ConnectionList,
  ConnectionState,
  DirectoryPage,
  FeedPage,
  Institution,
  MapCity,
  Post,
  PublicProfile,
  Skill,
} from '@connect-gsa/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from './api.js';
import { FEED_KEY } from './feed.js';

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    // O catálogo é pequeno e praticamente imutável: buscar de novo a cada
    // abertura do formulário seria requisição jogada fora.
    staleTime: 60 * 60 * 1000,
    queryFn: () => api.get<Skill[]>('/skills'),
  });
}

export function useInstitutionSearch(term: string) {
  return useQuery({
    queryKey: ['institutions', term],
    enabled: term.trim().length >= 2,
    queryFn: () => api.get<Institution[]>(`/institutions?q=${encodeURIComponent(term.trim())}`),
  });
}

export function useProposeInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; campus: string; acronym?: string }) =>
      api.post<Institution>('/institutions/proposals', input),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  });
}

export interface DirectoryFilters {
  q?: string;
  skill?: string;
  institutionId?: string;
  cityId?: string;
}

export function useDirectory(filters: DirectoryFilters) {
  return useInfiniteQuery({
    queryKey: ['directory', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      // `Object.entries` perde o tipo do valor; a anotação explícita evita que
      // um `any` atravesse até a montagem da URL.
      const params = new URLSearchParams();
      for (const [chave, valor] of Object.entries(filters) as [string, string | undefined][]) {
        if (valor) params.set(chave, valor);
      }
      if (pageParam) params.set('cursor', pageParam);
      return api.get<DirectoryPage>(`/directory?${params.toString()}`);
    },
    getNextPageParam: (last: DirectoryPage) => last.nextCursor ?? undefined,
  });
}

export function useMap() {
  return useQuery({ queryKey: ['map'], queryFn: () => api.get<MapCity[]>('/map') });
}

export function useCityPeople(cityId: string | null) {
  return useQuery({
    queryKey: ['map', 'city', cityId],
    enabled: cityId !== null,
    queryFn: () => api.get<AmbassadorCard[]>(`/map/cities/${cityId ?? ''}`),
  });
}

export function usePublicProfile(slug: string) {
  return useQuery({
    queryKey: ['profile', slug],
    queryFn: () => api.get<PublicProfile>(`/profiles/${encodeURIComponent(slug)}`),
  });
}

export function useAuthorPosts(slug: string) {
  return useQuery({
    queryKey: ['profile', slug, 'posts'],
    queryFn: () => api.get<Post[]>(`/profiles/${encodeURIComponent(slug)}/posts`),
  });
}

export function useConnections() {
  return useQuery({ queryKey: ['connections'], queryFn: () => api.get<ConnectionList>('/connections') });
}

/**
 * Age sobre o laço com outra pessoa.
 *
 * As listas do diretório, do mapa e das conexões guardam o estado da conexão
 * dentro de cada cartão. Invalidar todas de uma vez é mais simples — e mais
 * correto — do que tentar remendar cada cache com o novo estado: a mesma pessoa
 * pode estar em três listas ao mesmo tempo.
 */
/**
 * Pedir, aceitar, recusar e desfazer conexão.
 *
 * O feed entra na lista de caches atualizados, e essa ausência era um defeito
 * real: tocar em "Conectar" no cartão de uma publicação não mudava nada na tela,
 * porque a publicação em cache continuava dizendo `connection: 'none'`. O botão
 * parecia quebrado.
 *
 * O estado do laço é escrito NO CACHE do feed a partir da resposta do servidor,
 * em vez de invalidá-lo: invalidar refaria o feed inteiro e reordenaria as
 * publicações debaixo do dedo de quem só quis se conectar com alguém.
 */
export function useConnectionAction(userId: string) {
  const queryClient = useQueryClient();

  const aplicar = async (resposta: { connection: ConnectionState }) => {
    queryClient.setQueriesData<InfiniteData<FeedPage, string | undefined>>(
      { queryKey: FEED_KEY },
      (dados) =>
        dados
          ? {
              ...dados,
              pages: dados.pages.map((pagina) => ({
                ...pagina,
                posts: pagina.posts.map((post) =>
                  post.author.id === userId
                    ? { ...post, author: { ...post.author, connection: resposta.connection } }
                    : post,
                ),
              })),
            }
          : dados,
    );

    await Promise.all(
      [['connections'], ['directory'], ['map'], ['profile']].map((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      ),
    );
  };

  return {
    request: useMutation({
      mutationFn: () => api.post<{ connection: ConnectionState }>(`/connections/${userId}`),
      onSuccess: aplicar,
    }),
    accept: useMutation({
      mutationFn: () => api.post<{ connection: ConnectionState }>(`/connections/${userId}/accept`),
      onSuccess: aplicar,
    }),
    remove: useMutation({
      mutationFn: () => api.remove<{ connection: ConnectionState }>(`/connections/${userId}`),
      onSuccess: aplicar,
    }),
  };
}
