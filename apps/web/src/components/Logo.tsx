import { cn } from './ui.tsx';

/**
 * A marca do ConnectGSA.
 *
 * SVG inline, e não arquivo de imagem: acompanha a cor do tema, fica nítido em
 * qualquer densidade de tela e não custa uma requisição a mais — o que importa
 * contra o teto de transferência diária do plano gratuito.
 *
 * O símbolo é uma rede de nós formando um "C": os pontos são os embaixadores e
 * as linhas, as conexões entre eles.
 *
 * O mesmo desenho existe em `public/logo.svg`, para os dois consumidores que não
 * executam React: o ícone da aba do navegador e o README. Mexeu aqui, mexa lá.
 */

const AZUL = '#4285F4';
const VERMELHO = '#EA4335';
const AMARELO = '#FBBC04';
const VERDE = '#34A853';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn('size-8', className)} role="img" aria-label="ConnectGSA">
      {/* As arestas primeiro, para os nós ficarem por cima das pontas. */}
      <g stroke={AZUL} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M50 12 L18 34" />
        <path d="M18 34 L18 66" />
        <path d="M18 66 L50 88" />
      </g>
      <g stroke={VERDE} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M50 88 L82 66" />
      </g>
      <g stroke={VERMELHO} strokeWidth="5" strokeLinecap="round" fill="none">
        <path d="M50 12 L82 34" />
      </g>

      {/* O "C" aberto à direita, formado por dois arcos. */}
      <path
        d="M66 30 A24 24 0 0 0 34 50"
        stroke={AZUL}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M34 50 A24 24 0 0 0 66 70"
        stroke={VERDE}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* Os nós: cada ponto é um embaixador. */}
      <circle cx="50" cy="12" r="8" fill={VERMELHO} />
      <circle cx="18" cy="34" r="8" fill={AZUL} />
      <circle cx="18" cy="66" r="8" fill={AZUL} />
      <circle cx="50" cy="88" r="8" fill={VERDE} />
      <circle cx="82" cy="34" r="7" fill={AMARELO} />
      <circle cx="82" cy="66" r="8" fill={VERDE} />
    </svg>
  );
}

/**
 * A marca por extenso.
 *
 * O "Connect" acompanha a tinta do tema; "GSA" mantém as cores. Assim a
 * palavra continua legível no claro e no escuro — um azul fixo sumiria no
 * fundo escuro, e um preto fixo sumiria no claro.
 */
export function Wordmark({ className, showMark = true }: { className?: string; showMark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {showMark ? <LogoMark className="size-7 shrink-0" /> : null}
      <span className="text-lg font-medium tracking-tight">
        <span className="text-ink">Connect</span>
        <span style={{ color: VERMELHO }}>G</span>
        <span style={{ color: AMARELO }}>S</span>
        <span style={{ color: VERDE }}>A</span>
      </span>
    </span>
  );
}
