import { INVITE_QUOTA, type CreatedInvite } from '@connect-gsa/shared';
import { useMutation } from '@tanstack/react-query';
import { Check, Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api.js';
import { Button, Card } from './ui.tsx';

/**
 * Gerar e compartilhar um convite (US-022).
 *
 * O link vem PRONTO do servidor, montado a partir da URL pública configurada —
 * não de `window.location`. Um link construído no cliente sairia com
 * `localhost` quando a coordenação estivesse testando, e ninguém perceberia até
 * alguém tentar abrir.
 *
 * O código aparece uma única vez: o banco guarda só o hash, então nem nós
 * conseguimos recuperá-lo depois. A tela diz isso em vez de deixar a pessoa
 * descobrir sozinha ao recarregar.
 */
export function InviteShare() {
  const [copiado, setCopiado] = useState(false);

  const gerar = useMutation({
    mutationFn: () => api.post<CreatedInvite>('/invites', { validityDays: 30 }),
    onSuccess: () => setCopiado(false),
  });

  const convite = gerar.data;

  async function compartilhar() {
    if (!convite) return;

    // `navigator.share` abre a folha nativa no celular — que é onde o link vai
    // ser mandado. No desktop ela não existe, e a cópia resolve.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Convite para o ConnectGSA',
          text: 'Entre na rede dos embaixadores do programa:',
          url: convite.shareUrl,
        });
        return;
      } catch {
        // Cancelar a folha de compartilhamento não é erro — segue para a cópia.
      }
    }

    await navigator.clipboard.writeText(convite.shareUrl);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <Card>
      <h2 className="text-xl font-medium">Convidar alguém</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Gere um link e mande para quem é do programa. Vale por 30 dias e serve para uma pessoa só.
        Você pode criar até {INVITE_QUOTA.max} convites a cada {INVITE_QUOTA.days} dias.
      </p>

      {convite ? (
        <div className="mt-5 flex flex-col gap-3">
          <div className="rounded-field border border-border bg-surface-subtle p-4">
            {/*
              O código sozinho, grande, além do link. Ele existe justamente para
              ser DITADO — e ler oito caracteres no meio de uma URL é o oposto
              disso. `tracking-widest` separa os caracteres para quem soletra.
            */}
            <p className="font-mono text-2xl tracking-widest text-ink">{convite.code}</p>
            <p className="mt-3 font-mono text-xs break-all text-ink-muted">{convite.shareUrl}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void compartilhar()}>
              {copiado ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Share2 className="size-4" aria-hidden="true" />
              )}
              {copiado ? 'Link copiado' : 'Compartilhar link'}
            </Button>
            <Button variant="outline" disabled={gerar.isPending} onClick={() => gerar.mutate()}>
              <Copy className="size-4" aria-hidden="true" />
              Gerar outro
            </Button>
          </div>

          <p className="text-xs text-ink-muted">
            Guarde agora: por segurança, o código é gravado só como hash e não pode ser
            recuperado depois.
          </p>
        </div>
      ) : (
        <Button className="mt-5" disabled={gerar.isPending} onClick={() => gerar.mutate()}>
          {gerar.isPending ? 'Gerando…' : 'Gerar convite'}
        </Button>
      )}

      {gerar.error instanceof Error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {gerar.error.message}
        </p>
      ) : null}
    </Card>
  );
}
