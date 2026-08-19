import { DELETE_CONFIRMATION } from '@connect-gsa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ApiError } from './api.js';

const BASE_URL: string = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';

/**
 * Baixa os dados do titular (LGPD art. 18, V).
 *
 * O download não passa pelo cliente HTTP comum: precisamos do corpo cru para
 * virar arquivo, e não do objeto já convertido. O nome do arquivo vem do
 * cabeçalho que o servidor manda.
 */
export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const resposta = await fetch(`${BASE_URL}/me/export`, { credentials: 'include' });

      if (!resposta.ok) {
        throw new ApiError(resposta.status, 'Não foi possível exportar seus dados.', 'EXPORT');
      }

      const conteudo = await resposta.blob();
      const nome =
        /filename="([^"]+)"/.exec(resposta.headers.get('content-disposition') ?? '')?.[1] ??
        'connectgsa-meus-dados.json';

      // Âncora temporária: é o único jeito de o navegador salvar um arquivo
      // gerado em memória. Revogar o endereço depois evita segurar o blob.
      const endereco = URL.createObjectURL(conteudo);
      const link = document.createElement('a');
      link.href = endereco;
      link.download = nome;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(endereco);
    },
  });
}

/** Exclui a conta (LGPD art. 18, VI). Irreversível. */
export function useDeleteAccount() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confirmation: string) => {
      const resposta = await fetch(`${BASE_URL}/me`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as { message?: string } | null;
        throw new ApiError(
          resposta.status,
          corpo?.message ?? `Digite ${DELETE_CONFIRMATION} para confirmar.`,
          'DELETE',
        );
      }
    },
    onSuccess: async () => {
      // Zera o cache antes de sair: os dados da conta recém-apagada não podem
      // sobreviver em memória para a próxima pessoa que usar o computador.
      queryClient.clear();
      await navigate('/entrar', { replace: true });
    },
  });
}
