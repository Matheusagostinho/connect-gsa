import { NavLink } from 'react-router';
import { DESTINOS } from '../lib/navigation.js';
import { useUnreadCount } from '../lib/notifications.js';
import { Wordmark } from './Logo.tsx';
import { cn } from './ui.tsx';

/**
 * Navegação lateral, para telas largas.
 *
 * Fica grudada no topo (`sticky`) enquanto o conteúdo rola: numa rede em que a
 * pessoa desce muito no feed, ter que voltar ao começo para trocar de seção é o
 * tipo de atrito que faz não trocar.
 */
export function SideNav() {
  const { data } = useUnreadCount();
  const naoLidas = data?.unreadCount ?? 0;

  return (
    <nav
      aria-label="Seções"
      className="sticky top-0 hidden h-screen shrink-0 flex-col gap-1 py-8 pr-6 lg:flex lg:w-60"
    >
      <NavLink to="/" aria-label="ConnectGSA" className="mb-6 px-3">
        <Wordmark />
      </NavLink>

      <ul className="flex flex-col gap-1">
        {DESTINOS.map(({ to, label, Icon, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 items-center gap-3 rounded-pill px-4 text-base',
                  'transition-colors duration-200',
                  isActive
                    ? 'bg-surface-subtle font-medium text-ink'
                    : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
                )
              }
            >
              <span className="relative flex shrink-0">
                <Icon className="size-5" aria-hidden="true" />
                {badge && naoLidas > 0 ? (
                  <span
                    aria-hidden="true"
                    className="spark-gradient absolute -top-1 -right-1.5 flex min-w-4 items-center justify-center rounded-pill px-1 text-[0.6rem] leading-4 font-semibold text-white"
                  >
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                ) : null}
              </span>
              {label}
              {badge && naoLidas > 0 ? (
                <span className="sr-only">
                  {naoLidas} {naoLidas === 1 ? 'não lida' : 'não lidas'}
                </span>
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
