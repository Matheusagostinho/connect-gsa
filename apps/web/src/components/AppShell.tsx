import type { MyProfile } from '@connect-gsa/shared';
import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav.tsx';
import { SideNav } from './SideNav.tsx';
import { TopBar } from './TopBar.tsx';
import { AccountMenu } from './AccountMenu.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { cn } from './ui.tsx';

const LARGURAS = {
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
} as const;

/**
 * A moldura de toda tela autenticada.
 *
 * Uma estrutura só, dois arranjos por consulta de mídia — não dois componentes
 * com as mesmas regras escritas duas vezes:
 *
 * - **Tela larga:** coluna de navegação fixa à esquerda, conteúdo à direita.
 * - **Celular:** barra de seções embaixo, ao alcance do polegar, e marca,
 *   notificações e conta numa barra no topo.
 *
 * `bleed` desliga a caixa de leitura e o respiro para o conteúdo tomar toda a
 * área — é o que o mapa precisa, e o que texto corrido não deveria ter.
 */
export function AppShell({
  profile,
  children,
  width = 'lg',
  bleed = false,
}: {
  profile: MyProfile;
  children: ReactNode;
  width?: keyof typeof LARGURAS;
  bleed?: boolean;
}) {
  return (
    <div className="min-h-screen bg-surface">
      {/*
        Menos respiro lateral no celular: numa tela de 390px, 20px de cada lado
        custam 10% da largura do conteúdo — o cartão de publicação sente.
      */}
      <div className="mx-auto flex w-full max-w-7xl px-4 lg:px-8">
        <SideNav />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar profile={profile} />

          {/* No computador, notificações e conta ficam no alto do conteúdo. */}
          <div className="hidden items-center justify-end gap-1 pt-8 lg:flex">
            <NotificationBell />
            <AccountMenu profile={profile} />
          </div>

          <main
            className={cn(
              // A barra inferior é fixa: sem esta folga, o último elemento da
              // página fica embaixo dela e não dá para tocar.
              'w-full pb-24 lg:pb-10',
              bleed ? 'flex-1' : cn('mx-auto py-4 lg:py-6', LARGURAS[width]),
            )}
          >
            {children}
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/** Área que ocupa a altura útil da tela — usada pelo mapa (AC-064). */
export function FullBleed({ children }: { children: ReactNode }) {
  return (
    <div
      className="-mx-5 flex flex-col lg:-mx-8"
      // Desconta a barra do topo no celular e o respiro no computador.
      style={{ height: 'calc(100dvh - 8.5rem)' }}
    >
      {children}
    </div>
  );
}
