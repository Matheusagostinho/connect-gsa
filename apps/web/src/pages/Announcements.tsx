import { POST_LIMITS } from '@connect-gsa/shared';
import { Megaphone } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { AppShell } from '../components/AppShell.tsx';
import { PostCard } from '../components/PostCard.tsx';
import { Button, Card } from '../components/ui.tsx';
import { useAnnouncements, useCreateAnnouncement } from '../lib/announcements.js';
import { useMyProfile } from '../lib/session.js';

/**
 * O quadro de avisos.
 *
 * Cronológico, sem ranking: comunicado oficial não disputa atenção por
 * engajamento — um aviso importante que ninguém curtiu afundaria, e é
 * exatamente o que não pode acontecer.
 */
export function AnnouncementsPage() {
  const { data: profile } = useMyProfile();
  const { data: avisos = [], isPending } = useAnnouncements();
  const publicar = useCreateAnnouncement();
  const [texto, setTexto] = useState('');

  if (!profile) return null;

  const podePublicar = profile.role === 'admin' || profile.role === 'moderator';

  function enviar(event: FormEvent) {
    event.preventDefault();
    if (texto.trim().length === 0) return;

    publicar.mutate({ content: texto }, { onSuccess: () => setTexto('') });
  }

  return (
    <AppShell
      profile={profile}

      title="Avisos do programa"
      subtitle="Comunicados da coordenação, fora do feed para não se perderem na rolagem"
    >

      {podePublicar ? (
        <Card className="mb-4 p-5">
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <label htmlFor="aviso" className="text-sm font-medium text-ink">
              Publicar um comunicado
            </label>
            <textarea
              id="aviso"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              maxLength={POST_LIMITS.contentMax}
              rows={3}
              placeholder="O que a rede precisa saber?"
              className="w-full resize-none rounded-field border border-border bg-surface p-3 text-base text-ink outline-none placeholder:text-ink-muted"
            />

            {publicar.error instanceof Error ? (
              <p role="alert" className="text-sm font-medium text-danger">
                {publicar.error.message}
              </p>
            ) : null}

            <Button
              type="submit"
              className="self-start"
              disabled={texto.trim().length === 0 || publicar.isPending}
            >
              {publicar.isPending ? 'Publicando…' : 'Publicar aviso'}
            </Button>
          </form>
        </Card>
      ) : null}

      {isPending ? (
        <p className="py-8 text-center text-ink-muted" role="status">
          Carregando…
        </p>
      ) : null}

      {!isPending && avisos.length === 0 ? (
        <Card className="text-center">
          <Megaphone className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
          <h2 className="display mt-3 text-2xl">Nenhum aviso ainda</h2>
          <p className="mt-2 text-ink-muted">
            Quando a coordenação publicar um comunicado, ele aparece aqui.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        {avisos.map((aviso) => (
          <PostCard key={aviso.id} post={aviso} />
        ))}
      </div>
    </AppShell>
  );
}
