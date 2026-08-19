import type { MyProfile } from '@connect-gsa/shared';
import { Bell } from 'lucide-react';
import { NavLink } from 'react-router';
import { AccountMenu } from './AccountMenu.tsx';
import { useUnreadCount } from '../lib/notifications.js';
import { cn, Wordmark } from './ui.tsx';

/**
 * Barra do topo, só no celular.
 *
 * A barra inferior leva às seções; esta carrega a marca, as notificações e a
 * conta. Separar assim é o que permite cinco destinos embaixo sem apertar, e
 * mantém notificações num lugar previsível — o canto superior direito, onde
 * quase todo aplicativo a coloca.
 */
export function TopBar({ profile }: { profile: MyProfile }) {
  const { data } = useUnreadCount();
  const naoLidas = data?.unreadCount ?? 0;

  return (
    <header className="sticky top-0 z-30 -mx-5 mb-6 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-5 py-3 backdrop-blur-sm lg:hidden">
      <NavLink to="/" aria-label="ConnectGSA">
        <Wordmark />
      </NavLink>

      <div className="flex items-center gap-1">
        <NavLink
          to="/notificacoes"
          className={({ isActive }) =>
            cn(
              'relative flex size-11 items-center justify-center rounded-pill',
              'transition-colors duration-200',
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )
          }
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
        </NavLink>

        <AccountMenu profile={profile} />
      </div>
    </header>
  );
}
