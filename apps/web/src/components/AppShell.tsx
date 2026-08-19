import type { MyProfile } from '@connect-gsa/shared';
import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav.tsx';
import { PageHeader } from './PageHeader.tsx';
import { RightRail } from './RightRail.tsx';
import { SideNav } from './SideNav.tsx';
import { cn } from './ui.tsx';

/**
 * Uma largura, para toda tela.
 *
 * Havia duas — feed, avisos, perfil e configurações numa, diretório e conexões
 * noutra —, e a diferença aparecia como um salto do conteúdo ao trocar de
 * seção. Interface que muda de medida sozinha faz a pessoa reancorar o olho
 * toda vez.
 */
const LARGURA = 'max-w-5xl';

/**
 * A moldura de toda tela autenticada.
 *
 * Uma estrutura só, três arranjos por consulta de mídia — não três componentes
 * com as mesmas regras escritas em lugares diferentes:
 *
 * - **Celular:** barra de seções embaixo, ao alcance do polegar; marca,
 *   notificações e conta no cabeçalho.
 * - **Tela larga:** coluna de navegação à esquerda, conteúdo ao lado.
 * - **Tela muito larga:** mais a coluna de sugestões à direita.
 *
 * O mapa já teve a própria cópia disto, e a coluna de navegação saía oitenta
 * pixels fora de lugar quando se trocava de seção. Por isso `variant`
 * existe AQUI dentro: quem precisa de uma tela imersiva pede o modo, não uma
 * moldura paralela.
 *
 * - **`reading`** — coluna de leitura centrada, com respiro.
 * - **`immersive`** — o conteúdo toma a altura útil e o cabeçalho FLUTUA sobre
 *   ele. É o que o mapa precisa: numa tela de 390px, um cabeçalho sólido come
 *   um quinto do mapa.
 */
export function AppShell({
  profile,
  children,
  variant = 'reading',
  rail = false,
  title,
  subtitle,
  tabs,
  lead,
}: {
  profile: MyProfile;
  children: ReactNode;
  variant?: 'reading' | 'immersive';
  /** Mostra a coluna de sugestões em telas muito largas. */
  rail?: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  tabs?: ReactNode;
  lead?: ReactNode;
}) {
  const imersivo = variant === 'immersive';

  return (
    <div className={cn('bg-surface', imersivo ? 'h-dvh overflow-hidden' : 'min-h-screen')}>
      {/*
        Menos respiro lateral no celular: numa tela de 390px, 20px de cada lado
        custam 10% da largura do conteúdo — o cartão de publicação sente.
      */}
      <div
        className={cn(
          'mx-auto flex w-full max-w-7xl px-4 lg:px-8',
          imersivo && 'h-full max-lg:px-0',
        )}
      >
        <SideNav />

        {/*
          A largura máxima fica na COLUNA, não só no conteúdo. Aplicá-la apenas
          ao `main` deixava o cabeçalho esticar por toda a área livre enquanto o
          conteúdo ficava centrado embaixo — as duas coisas desalinhadas, e a
          única página onde isso não aparecia era a que tinha a coluna da
          direita ocupando a sobra.
        */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            // Fio nas laterais, só em tela larga: sem ele a coluna não tem
            // limite visível, e o mapa — que é cinza como o fundo da página —
            // parecia vazar para fora da grade.
            'lg:border-x lg:border-border',
            imersivo ? 'relative h-full' : cn('mx-auto w-full', LARGURA),
          )}
        >
          {/*
            No modo imersivo o cabeçalho é posicionado por cima do conteúdo, e
            não empilhado antes dele — daí `absolute` em vez de `sticky`. O
            `pointer-events-none` no invólucro devolve o arraste do mapa à faixa
            transparente ao redor dos controles.
          */}
          <div
            className={cn(
              imersivo && 'pointer-events-none absolute inset-x-0 top-0 z-30 [&>header]:border-0',
              // Fundo translúcido e desfocado, e NÃO transparente: sobre o mapa,
              // a marca caía em cima dos rótulos das cidades e as duas coisas
              // ficavam ilegíveis ao mesmo tempo. A margem descola a faixa da
              // borda da tela.
              imersivo && '[&>header]:m-3 [&>header]:rounded-card [&>header]:bg-surface/85',
              imersivo && '[&>header]:border [&>header]:border-border',
              imersivo && '[&_a]:pointer-events-auto [&_button]:pointer-events-auto',
            )}
          >
            <PageHeader
              profile={profile}
              {...(title === undefined ? {} : { title })}
              {...(subtitle === undefined ? {} : { subtitle })}
              {...(tabs === undefined ? {} : { tabs })}
              {...(lead === undefined ? {} : { lead })}
            />
          </div>

          <main
            className={cn(
              imersivo
                ? 'min-h-0 flex-1'
                : cn(
                    // A barra inferior é fixa: sem esta folga, o último
                    // elemento da página fica embaixo dela e não dá para tocar.
                    'w-full pt-4 pb-24 lg:pb-10',
                    // Respiro contra o fio lateral da coluna. No celular o fio
                    // não existe e a margem já vem do contêiner de fora.
                    'lg:px-5',
                  ),
            )}
          >
            {children}
          </main>
        </div>

        {rail ? <RightRail /> : null}
      </div>

      <BottomNav />
    </div>
  );
}
