import { NavLink } from 'react-router';
import { DESTINOS } from '../lib/navigation.js';
import { cn } from './ui.tsx';

/**
 * Barra inferior, para celular.
 *
 * Fica embaixo porque é onde o polegar alcança — no topo, cada troca de seção
 * exige reposicionar a mão. `env(safe-area-inset-bottom)` afasta a barra da
 * faixa de gesto dos aparelhos sem botão físico, senão o último item fica
 * embaixo dela.
 */
export function BottomNav() {
  const itens = DESTINOS.filter((d) => d.mobile);

  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-raised lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around">
        {itens.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5',
                  'transition-colors duration-200',
                  isActive ? 'text-ink' : 'text-ink-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className="size-6 shrink-0"
                    aria-hidden="true"
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span className="text-[0.65rem] leading-none">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
