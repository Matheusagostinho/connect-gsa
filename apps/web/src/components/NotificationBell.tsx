import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useNotifications, useUnreadCount } from '../lib/notifications.js';
import { Avatar } from './Avatar.tsx';
import { cn } from './ui.tsx';

/** Mais que isso vira uma segunda página dentro de um menu. */
const QUANTAS_NA_CAIXA = 5;

function quandoFoi(iso: string): string {
  const minutos = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  if (minutos < 1440) return `há ${Math.floor(minutos / 60)} h`;
  return `há ${Math.floor(minutos / 1440)} d`;
}

const RESUMO: Record<string, string> = {
  connectionRequest: 'quer se conectar',
  connectionAccepted: 'aceitou seu pedido',
  reaction: 'reagiu à sua publicação',
  comment: 'comentou na sua publicação',
};

/**
 * O sino, com a caixa das notificações recentes.
 *
 * Abrir uma caixa ali mesmo, em vez de trocar de página, é o que permite checar
 * sem perder o lugar onde a pessoa estava — a página inteira continua existindo
 * para quem quer ver tudo.
 *
 * A lista só é buscada quando a caixa abre. O contador, esse sim, acompanha a
 * navegação o tempo todo — mas ele é um número, não uma lista.
 */
export function NotificationBell() {
  const [aberta, setAberta] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const { data: contador } = useUnreadCount();
  const { feed, marcarVisto } = useNotifications();

  const naoLidas = contador?.unreadCount ?? 0;

  useEffect(() => {
    if (!aberta) return;

    const fechar = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setAberta(false);
        return;
      }
      if (!container.current?.contains(event.target as Node)) setAberta(false);
    };

    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', fechar);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('keydown', fechar);
    };
  }, [aberta]);

  const recentes = (feed.data?.notifications ?? []).slice(0, QUANTAS_NA_CAIXA);

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => {
          const abrindo = !aberta;
          setAberta(abrindo);
          // Abrir a caixa conta como olhar: o contador zera, e a lista continua.
          if (abrindo && naoLidas > 0) marcarVisto.mutate();
        }}
        aria-expanded={aberta}
        aria-haspopup="dialog"
        className={cn(
          'relative flex size-11 cursor-pointer items-center justify-center rounded-pill',
          'transition-colors duration-200',
          aberta ? 'bg-surface-subtle text-ink' : 'text-ink-muted hover:text-ink',
        )}
      >
        <Bell className="size-5" aria-hidden="true" />
        {naoLidas > 0 ? (
          <span
            aria-hidden="true"
            className="spark-gradient absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-pill px-1 text-[0.6rem] leading-4 font-semibold text-white"
          >
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        ) : null}
        <span className="sr-only">
          Notificações
          {naoLidas > 0 ? `: ${naoLidas} ${naoLidas === 1 ? 'não lida' : 'não lidas'}` : ''}
        </span>
      </button>

      {aberta ? (
        <div
          role="dialog"
          aria-label="Notificações recentes"
          className={cn(
            'absolute top-full right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))]',
            'rounded-card border border-border bg-surface-raised p-1.5 shadow-[var(--shadow-card)]',
          )}
        >
          <p className="px-3 py-2 text-sm font-medium text-ink">Notificações</p>

          {feed.isPending ? (
            <p className="px-3 py-4 text-sm text-ink-muted" role="status">
              Carregando…
            </p>
          ) : null}

          {!feed.isPending && recentes.length === 0 ? (
            <p className="px-3 py-4 text-sm text-ink-muted">Nada por aqui ainda.</p>
          ) : null}

          <ul className="flex flex-col">
            {recentes.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.post ? '/' : '/conexoes'}
                  onClick={() => setAberta(false)}
                  className="flex items-start gap-3 rounded-field px-3 py-2.5 transition-colors duration-200 hover:bg-surface-subtle"
                >
                  <Avatar name={n.actor.name} imageUrl={n.actor.imageUrl} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      <span className="font-medium text-ink">{n.actor.name}</span>{' '}
                      <span className="text-ink-muted">{RESUMO[n.kind] ?? ''}</span>
                    </span>
                    <span className="block text-xs text-ink-muted">{quandoFoi(n.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to="/notificacoes"
            onClick={() => setAberta(false)}
            className="mt-1 block rounded-field px-3 py-2.5 text-center text-sm font-medium text-ink transition-colors duration-200 hover:bg-surface-subtle"
          >
            Ver todas as notificações
          </Link>
        </div>
      ) : null}
    </div>
  );
}
