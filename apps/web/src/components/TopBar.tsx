import type { MyProfile } from '@connect-gsa/shared';
import { NavLink } from 'react-router';
import { AccountMenu } from './AccountMenu.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { Wordmark } from './Logo.tsx';

/**
 * Barra do topo, só no celular.
 *
 * A barra inferior leva às seções; esta carrega a marca, as notificações e a
 * conta. Separar assim é o que permite cinco destinos embaixo sem apertar, e
 * mantém notificações num lugar previsível — o canto superior direito, onde
 * quase todo aplicativo a coloca.
 */
export function TopBar({ profile }: { profile: MyProfile }) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-2 border-b border-border bg-surface/90 px-4 py-2.5 backdrop-blur-sm lg:hidden">
      <NavLink to="/" aria-label="ConnectGSA">
        <Wordmark />
      </NavLink>

      <div className="flex items-center gap-1">
        <NotificationBell />
        <AccountMenu profile={profile} />
      </div>
    </header>
  );
}
