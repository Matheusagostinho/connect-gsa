import type { MyProfile } from '@connect-gsa/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError, api } from './api.js';

/**
 * O perfil da sessão atual.
 *
 * Um 401 aqui não é erro: é a resposta legítima para "ninguém está logado".
 * Tratá-lo como falha faria o React Query tentar de novo três vezes e a tela
 * de login piscar um estado de erro que não existe.
 */
export function useMyProfile(): UseQueryResult<MyProfile | null> {
  return useQuery({
    queryKey: ['me'],
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 2,
    queryFn: async () => {
      try {
        return await api.get<MyProfile>('/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}
