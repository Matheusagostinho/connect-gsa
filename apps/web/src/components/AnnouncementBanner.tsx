import { Megaphone } from 'lucide-react';
import { Link } from 'react-router';
import { useLatestAnnouncement } from '../lib/announcements.js';
import { RichText } from './RichText.tsx';

/**
 * O aviso mais recente, em destaque no topo do feed.
 *
 * Existe para resolver o custo do quadro ser separado: comunicado que só vive
 * numa aba própria depende de a pessoa lembrar de visitá-la. Aqui ele alcança
 * quem já está no feed, sem virar mais um post competindo por engajamento.
 *
 * Some sozinho depois de duas semanas — quem decide isso é o servidor. Aviso
 * velho fixo no topo vira ruído e ensina a ignorar o espaço.
 */
export function AnnouncementBanner() {
  const { data: aviso } = useLatestAnnouncement();

  if (!aviso) return null;

  return (
    <Link
      to="/avisos"
      className="mb-4 flex items-start gap-3 rounded-card border border-border bg-surface-subtle p-4 transition-colors duration-200 hover:border-border-strong"
    >
      <Megaphone className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
          Aviso do programa
        </p>
        <p className="mt-1 line-clamp-3 text-sm break-words text-ink">
          <RichText text={aviso.content} />
        </p>
        <p className="mt-2 text-xs text-ink-muted">Ver o quadro de avisos</p>
      </div>
    </Link>
  );
}
