import type { MyProfile } from '@connect-gsa/shared';
import { Compass, Map, Newspaper, Users } from 'lucide-react';
import { NavLink } from 'react-router';
import { AccountMenu } from './AccountMenu.tsx';
import { cn, Wordmark } from './ui.tsx';

const ITENS = [
  { to: '/', label: 'Feed', Icon: Newspaper },
  { to: '/diretorio', label: 'Diretório', Icon: Compass },
  { to: '/mapa', label: 'Mapa', Icon: Map },
  { to: '/conexoes', label: 'Conexões', Icon: Users },
] as const;

/**
 * Navegação principal.
 *
 * Quatro destinos, o limite prático para uma barra que também precisa caber num
 * celular. `NavLink` marca o item atual com `aria-current`, que é o que um
 * leitor de tela usa para dizer onde a pessoa está.
 */
export function AppNav({ profile }: { profile: MyProfile }) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-6">
        <NavLink to="/" aria-label="ConnectGSA">
          <Wordmark />
        </NavLink>

        <nav aria-label="Seções">
          <ul className="flex items-center gap-1">
            {ITENS.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-10 items-center gap-2 rounded-pill px-3 text-sm font-medium',
                      'transition-colors duration-200',
                      isActive ? 'bg-surface-subtle text-ink' : 'text-ink-muted hover:text-ink',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <AccountMenu profile={profile} />
    </header>
  );
}
