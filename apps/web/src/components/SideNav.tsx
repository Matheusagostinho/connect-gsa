import { NavLink } from 'react-router';
import { DESTINOS } from '../lib/navigation.js';
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
  return (
    <nav
      aria-label="Seções"
      className="sticky top-0 hidden h-screen shrink-0 flex-col gap-1 py-8 pr-6 lg:flex lg:w-60"
    >
      <NavLink to="/" aria-label="ConnectGSA" className="mb-6 px-3">
        <Wordmark />
      </NavLink>

      <ul className="flex flex-col gap-1">
        {DESTINOS.map(({ to, label, Icon }) => (
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
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
