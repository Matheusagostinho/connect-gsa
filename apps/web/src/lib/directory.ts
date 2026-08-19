import type {
  AmbassadorCard,
  ConnectionList,
  ConnectionState,
  DirectoryPage,
  Institution,
  MapCity,
  Post,
  PublicProfile,
  Skill,
} from '@connect-gsa/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

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
export function useConnectionAction(userId: string) {
  const queryClient = useQueryClient();

  const invalidar = async () => {
    await Promise.all(
      [['connections'], ['directory'], ['map'], ['profile']].map((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      ),
    );
  };

  return {
    request: useMutation({
      mutationFn: () => api.post<{ connection: ConnectionState }>(`/connections/${userId}`),
      onSuccess: invalidar,
    }),
    accept: useMutation({
      mutationFn: () => api.post<{ connection: ConnectionState }>(`/connections/${userId}/accept`),
      onSuccess: invalidar,
    }),
    remove: useMutation({
      mutationFn: () => api.remove<{ connection: ConnectionState }>(`/connections/${userId}`),
      onSuccess: invalidar,
    }),
  };
}
