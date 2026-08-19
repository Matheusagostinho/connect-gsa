import type { MyProfile } from '@connect-gsa/shared';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { AccountMenu } from './AccountMenu.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { Wordmark } from './Logo.tsx';
import { cn } from './ui.tsx';

/**
 * O cabeçalho da página, grudado no topo da COLUNA DE CONTEÚDO.
 *
 * Antes o sino e a conta flutuavam no canto da janela, a trezentos pixels do
 * conteúdo — davam a impressão de pertencer ao navegador, não à página. Aqui
 * eles ficam na mesma coluna que o título, que é onde o olho já está.
 *
 * Um componente para os dois tamanhos, e não dois componentes com as mesmas
 * regras escritas duas vezes:
 *
 * - **No celular** a marca ocupa a primeira linha (é a única âncora de volta ao
 *   início, já que a barra inferior fica com as seções) e o título vem abaixo.
 * - **No computador** a marca já está na coluna lateral, então a primeira linha
 *   é o título.
 *
 * O fundo é translúcido com desfoque: o conteúdo passando por baixo diz que a
 * página continua ali, enquanto o cabeçalho permanece legível.
 */
export function PageHeader({
  profile,
  title,
  subtitle,
  tabs,
  lead,
}: {
  profile: MyProfile;
  /** Título da seção. Ausente em telas cujo conteúdo já se identifica. */
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Abas ou filtros, colados abaixo do título. */
  tabs?: ReactNode;
  /** Elemento antes do título — o botão de voltar, no perfil. */
  lead?: ReactNode;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 -mx-4 border-b border-border bg-surface/85 backdrop-blur-md lg:-mx-0',
      )}
    >
      <div className="flex min-h-14 items-center gap-3 px-4 py-2 lg:min-h-16 lg:px-5">
        <NavLink to="/" aria-label="ConnectGSA" className="lg:hidden">
          <Wordmark />
        </NavLink>

        {lead}

        {title ? (
          <div className="ml-auto min-w-0 lg:ml-0 lg:flex-1">
            {/*
              `max-lg:sr-only`: no celular o título ocuparia a mesma linha da
              marca e as duas se espremeriam. Ele continua na árvore para quem
              lê por leitor de tela, e aparece desenhado na linha de baixo.
            */}
            <h1 className="truncate text-lg font-medium text-ink max-lg:sr-only">{title}</h1>
            {subtitle ? (
              <p className="truncate text-xs text-ink-muted max-lg:sr-only">{subtitle}</p>
            ) : null}
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-1">
          <NotificationBell />
          <AccountMenu profile={profile} />
        </div>
      </div>

      {title ? (
        <div className="px-4 pb-2 lg:hidden">
          <p className="truncate text-lg font-medium text-ink">{title}</p>
          {subtitle ? <p className="truncate text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
      ) : null}

      {tabs}
    </header>
  );
}
