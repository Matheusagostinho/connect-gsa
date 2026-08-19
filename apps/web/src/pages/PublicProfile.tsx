import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { AppShell } from '../components/AppShell.tsx';
import { ProfileView } from '../components/ProfileView.tsx';
import { Card } from '../components/ui.tsx';
import { usePublicProfile } from '../lib/directory.js';
import { useMyProfile } from '../lib/session.js';

/**
 * O perfil de outro embaixador, no endereço `/perfil/{slug}`.
 *
 * É a página que circula em conversa, então o endereço precisa ser legível e
 * estável — daí o slug em vez do id (AC-046).
 */
export function PublicProfilePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { data: me } = useMyProfile();
  const { data: profile, isPending, error } = usePublicProfile(slug);

  if (!me) return null;

  const souEu = profile?.id === me.id;

  return (
    <AppShell
      profile={me}

      lead={
        <button
          type="button"
          // `-1` e não uma rota fixa: quem chegou aqui pelo feed espera voltar
          // ao feed, e quem chegou pelo diretório espera voltar ao diretório.
          onClick={() => void navigate(-1)}
          aria-label="Voltar"
          className="hidden size-10 shrink-0 cursor-pointer items-center justify-center rounded-pill text-ink-muted transition-colors duration-200 hover:bg-surface-subtle hover:text-ink lg:flex"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
      }
    >
      {isPending ? (
        <p className="py-8 text-center text-ink-muted" role="status">
          Carregando…
        </p>
      ) : null}

      {error instanceof Error ? (
        <Card className="text-center">
          <h2 className="display text-2xl">Perfil não encontrado</h2>
          <p className="mt-2 text-ink-muted">
            Esse endereço não existe, ou a pessoa ainda não concluiu o perfil.
          </p>
        </Card>
      ) : null}

      {profile ? <ProfileView profile={profile} {...(souEu ? { eu: me } : {})} /> : null}
    </AppShell>
  );
}
