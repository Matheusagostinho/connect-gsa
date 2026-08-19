import type { CreateAnnouncement, Post } from '@connect-gsa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';
import { FEED_KEY } from './feed.js';

export function useAnnouncements() {
  return useQuery({ queryKey: ['announcements'], queryFn: () => api.get<Post[]>('/announcements') });
}

/**
 * O aviso em destaque no topo do feed.
 *
 * Um quadro que ninguém visita é um quadro morto — este é o caminho de volta,
 * para o comunicado alcançar quem já está no feed. `null` quando não há aviso
 * recente, e a faixa simplesmente não aparece.
 */
export function useLatestAnnouncement() {
  return useQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: () => api.get<Post | null>('/announcements/latest'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAnnouncement) => api.post<Post>('/announcements', input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['announcements'] }),
        // O destaque do feed vem da mesma origem e precisa acompanhar.
        queryClient.invalidateQueries({ queryKey: FEED_KEY }),
      ]);
    },
  });
}
