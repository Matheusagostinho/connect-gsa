import { REACTION_META, type Notification } from '@connect-gsa/shared';
import { Bell, MessageCircle, UserCheck, UserPlus } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { AppShell } from '../components/AppShell.tsx';
import { Avatar } from '../components/Avatar.tsx';
import { Card, cn } from '../components/ui.tsx';
import { useNotifications } from '../lib/notifications.js';
import { useMyProfile } from '../lib/session.js';

function quandoFoi(iso: string): string {
  const minutos = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 1440) return `há ${Math.floor(minutos / 60)} h`;
  if (minutos < 10080) return `há ${Math.floor(minutos / 1440)} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function descrever(n: Notification): { texto: string; Icone: typeof Bell } {
  switch (n.kind) {
    case 'connectionRequest':
      return { texto: 'quer se conectar com você', Icone: UserPlus };
    case 'connectionAccepted':
      return { texto: 'aceitou seu pedido de conexão', Icone: UserCheck };
    case 'comment':
      return { texto: 'comentou na sua publicação', Icone: MessageCircle };
    case 'reaction':
      return {
        texto: n.reaction
          ? `reagiu com ${REACTION_META[n.reaction].label} à sua publicação`
          : 'reagiu à sua publicação',
        Icone: Bell,
      };
  }
}

export function NotificationsPage() {
  const { data: profile } = useMyProfile();
  const { feed, marcarVisto } = useNotifications();

  // Abrir a tela é o ato de "olhar" — daí marcar visto na montagem, uma vez só.
  // O que já estava na lista continua nela: visto não apaga (AC-067).
  const marcar = marcarVisto.mutate;
  useEffect(() => {
    marcar();
  }, [marcar]);

  if (!profile) return null;

  const itens = feed.data?.notifications ?? [];

  return (
    <AppShell profile={profile}>
      <h1 className="display mb-6 text-3xl sm:text-4xl">Notificações</h1>

      {feed.isPending ? (
        <p className="py-8 text-center text-ink-muted" role="status">
          Carregando…
        </p>
      ) : null}

      {!feed.isPending && itens.length === 0 ? (
        <Card className="text-center">
          <Bell className="mx-auto size-6 text-ink-muted" aria-hidden="true" />
          <h2 className="display mt-3 text-2xl">Nada por aqui ainda</h2>
          <p className="mt-2 text-ink-muted">
            Quando alguém reagir, comentar ou pedir conexão, aparece nesta tela.
          </p>
        </Card>
      ) : null}

      <ul className="flex flex-col gap-2">
        {itens.map((n) => {
          const { texto, Icone } = descrever(n);
          const destino = n.post ? '/' : '/conexoes';

          return (
            <li key={n.id}>
              <Link
                to={destino}
                className={cn(
                  'flex items-start gap-3 rounded-card border p-4 transition-colors duration-200',
                  n.unread
                    ? 'border-border bg-surface-subtle'
                    : 'border-transparent hover:bg-surface-subtle',
                )}
              >
                <Avatar name={n.actor.name} imageUrl={n.actor.imageUrl} size={40} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-ink">{n.actor.name}</span>{' '}
                    <span className="text-ink-muted">{texto}</span>
                  </p>
                  {n.post ? (
                    <p className="mt-1 truncate text-sm text-ink-muted">“{n.post.excerpt}”</p>
                  ) : null}
                  <p className="mt-1 text-xs text-ink-muted">
                    {quandoFoi(n.createdAt)}
                    {n.unread ? <span className="sr-only"> · não lida</span> : null}
                  </p>
                </div>

                <Icone className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
