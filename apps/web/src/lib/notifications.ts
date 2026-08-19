import type { NotificationFeed } from '@connect-gsa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

const CONTADOR = ['notifications', 'count'] as const;

/**
 * O contador de não lidas, para a navegação.
 *
 * Busca só o número, não a lista: a navegação aparece em toda tela, e carregar
 * as notificações inteiras a cada visita seria desperdício. `refetchInterval`
 * mantém o número fresco sem exigir tempo real — que é uma fatia inteira,
 * ainda não construída.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: CONTADOR,
    queryFn: () => api.get<{ unreadCount: number }>('/notifications/count'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useNotifications() {
  const queryClient = useQueryClient();

  const feed = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationFeed>('/notifications'),
  });

  const marcarVisto = useMutation({
    mutationFn: () => api.post<{ ok: true }>('/notifications/seen'),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: CONTADOR }),
  });

  return { feed, marcarVisto };
}
