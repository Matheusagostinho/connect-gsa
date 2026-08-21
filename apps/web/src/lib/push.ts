import type { PushStatus } from '@connect-gsa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

/**
 * Autorizar o aviso por notificação.
 *
 * ## Três coisas precisam ser verdade, e nenhuma depende de nós
 *
 * 1. O navegador precisa suportar `Notification` e `PushManager`.
 * 2. O servidor precisa ter chaves VAPID configuradas.
 * 3. **No iPhone, o aplicativo precisa estar INSTALADO na tela inicial.** O
 *    Safari não expõe push para uma aba comum — nem pergunta, simplesmente não
 *    existe. Sem dizer isso na tela, metade dos embaixadores acharia que está
 *    quebrado.
 *
 * Por isso a interface pergunta antes de oferecer, em vez de mostrar um botão
 * que não faz nada.
 */

/** A chave pública vem em base64 seguro para URL; o navegador quer bytes. */
function paraBytes(base64: string): ArrayBuffer {
  const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const normal = preenchido.replace(/-/g, '+').replace(/_/g, '/');
  const cru = window.atob(normal);

  // `ArrayBuffer` e não `Uint8Array`: o tipo de `applicationServerKey` é
  // `BufferSource`, e o `Uint8Array` do TypeScript 5.9 é genérico sobre o buffer
  // subjacente — o que faz a atribuição direta falhar.
  const bytes = new Uint8Array(cru.length);
  for (let i = 0; i < cru.length; i += 1) bytes[i] = cru.charCodeAt(i);
  return bytes.buffer;
}

export function suportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * `true` quando a página roda como aplicativo instalado.
 *
 * `standalone` é a propriedade não padronizada do Safari no iOS — é a única
 * forma de saber lá, e é justamente lá que a informação importa.
 */
export function instalado(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function usePushStatus() {
  return useQuery({
    queryKey: ['push', 'status'],
    queryFn: () => api.get<PushStatus>('/push/status'),
  });
}

export function useAutorizarPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (publicKey: string) => {
      // A permissão precisa ser pedida de dentro de um gesto da pessoa —
      // navegadores recusam o pedido automático, e com razão.
      const permissao = await Notification.requestPermission();
      if (permissao !== 'granted') throw new Error('Permissão negada');

      const registro = await navigator.serviceWorker.ready;

      // `userVisibleOnly` é obrigatório e só aceita `true`: o padrão proíbe
      // push silencioso, que seria rastreamento em segundo plano.
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: paraBytes(publicKey),
      });

      await api.post('/push/subscribe', inscricao.toJSON());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['push', 'status'] }),
  });
}

export function useDesautorizarPush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();
      if (!inscricao) return;

      // O servidor primeiro: se a ordem fosse inversa e a rede falhasse no meio,
      // o aparelho pararia de receber e o banco continuaria achando que entrega.
      await api.post('/push/unsubscribe', { endpoint: inscricao.endpoint });
      await inscricao.unsubscribe();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['push', 'status'] }),
  });
}
