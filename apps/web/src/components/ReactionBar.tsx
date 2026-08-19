import { REACTION_META, REACTION_ORDER, type Reaction } from '@connect-gsa/shared';
import { useEffect, useRef, useState } from 'react';
import { ReactionIcon } from './ReactionIcon.tsx';
import { cn } from './ui.tsx';

/** A reação aplicada por um toque só, sem escolher nada. */
const PRINCIPAL: Reaction = 'liftoff';

/**
 * Quanto tempo o dedo precisa ficar parado para a fileira abrir.
 *
 * Abaixo disso, um toque comum dispara a fileira sem querer; acima, o gesto
 * parece travado e a pessoa solta antes de acontecer qualquer coisa.
 */
const ESPERA_MS = 450;

/**
 * Quanto o ponteiro pode andar antes de virar rolagem.
 *
 * Num feed, o dedo que desce a tela quase sempre começa em cima de algum
 * elemento. Sem este limiar, rolar viraria uma loteria de menus abertos.
 */
const LIMIAR_ARRASTO = 10;

/**
 * A barra de reações.
 *
 * Uma reação por post, trocável: escolher outra substitui a anterior, e
 * escolher a mesma desfaz.
 *
 * No cartão fica só o ÍCONE. O rótulo escrito repetia o que o desenho já diz e
 * custava largura suficiente para o nome de quem publicou virar reticências —
 * e o nome identifica a pessoa, a reação não.
 *
 * A interação tem três portas, uma para cada forma de usar o produto:
 *
 * - **Toque curto** aplica a reação. É a ação mais comum, e obrigar a escolher
 *   numa lista a cada vez a transformaria na mais cara.
 * - **Pressionar e segurar** abre a fileira, como no Facebook — mas cancelando
 *   ao primeiro arrasto, senão rolar o feed abriria menus sem parar.
 * - **Seta para cima** abre a fileira no teclado, onde "segurar" não existe.
 *   Sem isso, as reações de intenção — o diferencial desta rede — ficariam
 *   inalcançáveis para quem não usa ponteiro, que é o mesmo erro do hover que
 *   já corrigimos uma vez.
 */
export function ReactionBar({
  counts,
  mine,
  onReact,
  disabled = false,
}: {
  counts: Partial<Record<Reaction, number>>;
  mine: Reaction | null;
  onReact: (reaction: Reaction) => void;
  disabled?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const [pulsando, setPulsando] = useState(false);
  /** Qual reação disparou a animação — decide se ela decola ou pulsa. */
  const [escolhida, setEscolhida] = useState<Reaction | null>(null);
  /** Muda a cada escolha, para o ícone ser remontado e a animação reiniciar. */
  const [desenho, setDesenho] = useState(0);
  const container = useRef<HTMLDivElement>(null);

  const temporizador = useRef<number | null>(null);
  const origem = useRef<{ x: number; y: number } | null>(null);
  /** Marca que a fileira abriu por pressão, para o clique seguinte não reagir. */
  const abriuSegurando = useRef(false);

  useEffect(() => {
    if (!aberta) return;

    const fechar = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setAberta(false);
        return;
      }
      if (!container.current?.contains(event.target as Node)) setAberta(false);
    };

    document.addEventListener('mousedown', fechar);
    document.addEventListener('keydown', fechar);
    return () => {
      document.removeEventListener('mousedown', fechar);
      document.removeEventListener('keydown', fechar);
    };
  }, [aberta]);

  /** Solta o temporizador ao desmontar: um post pode sair da tela no meio do gesto. */
  useEffect(() => cancelarEspera, []);

  function cancelarEspera() {
    if (temporizador.current !== null) {
      window.clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    origem.current = null;
  }

  const total = Object.values(counts).reduce((soma: number, n) => soma + (n ?? 0), 0);
  const presentes = REACTION_ORDER.filter((reaction) => (counts[reaction] ?? 0) > 0);
  const atual = mine ? REACTION_META[mine] : REACTION_META[PRINCIPAL];

  function escolher(reaction: Reaction) {
    setEscolhida(reaction);
    setPulsando(true);
    setDesenho((n) => n + 1);
    setAberta(false);
    onReact(reaction);
    // A decolagem é mais longa que o pulso; esperar o maior evita cortar o
    // foguete no meio do voo.
    window.setTimeout(() => setPulsando(false), reaction === 'liftoff' ? 620 : 340);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div ref={container} className="relative">
        {aberta ? (
          <div
            role="group"
            aria-label="Escolha uma reação"
            className={cn(
              'absolute bottom-full left-0 z-10 mb-2 flex gap-0.5 rounded-card border border-border',
              'bg-surface-raised p-1.5 shadow-[var(--shadow-card)]',
              // Sem o teto, a fileira ultrapassa a borda da tela em 375px e
              // aparece uma barra de rolagem horizontal na página inteira.
              'max-w-[calc(100vw-2.5rem)]',
            )}
          >
            {REACTION_ORDER.map((reaction, indice) => {
              const meta = REACTION_META[reaction];
              return (
                <button
                  key={reaction}
                  type="button"
                  title={meta.description}
                  aria-label={`${meta.label}: ${meta.description}`}
                  aria-pressed={mine === reaction}
                  onClick={() => escolher(reaction)}
                  style={{ animationDelay: `${indice * 28}ms` }}
                  className={cn(
                    'reacao-entra reacao-hover flex w-[3.25rem] shrink cursor-pointer',
                    'flex-col items-center gap-0.5 rounded-field px-1 py-2 sm:w-16',
                    mine === reaction && 'bg-surface-subtle',
                  )}
                >
                  <ReactionIcon reaction={reaction} className="size-5" colored={mine === reaction} />
                  {/*
                    Aqui o rótulo FICA: "Bora junto" e "Posso ajudar" são
                    intenções, e desenho nenhum as comunica sozinho. Na fileira
                    a pessoa está justamente escolhendo, e é o momento em que
                    saber o que cada uma significa importa.
                  */}
                  <span className="text-[0.65rem] leading-tight font-medium text-ink-muted">
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          aria-pressed={mine !== null}
          aria-expanded={aberta}
          aria-haspopup="true"
          // O nome acessível é a única coisa que sobreviveu do rótulo: sem ele o
          // botão vira um desenho anônimo para quem lê por leitor de tela.
          aria-label={
            mine
              ? `Sua reação: ${atual.label}. Segure ou use a seta para cima para trocar`
              : 'Reagir com Decolou. Segure ou use a seta para cima para escolher outra'
          }
          onPointerDown={(event) => {
            if (disabled) return;
            abriuSegurando.current = false;
            origem.current = { x: event.clientX, y: event.clientY };
            temporizador.current = window.setTimeout(() => {
              abriuSegurando.current = true;
              setAberta(true);
              cancelarEspera();
            }, ESPERA_MS);
          }}
          onPointerMove={(event) => {
            const inicio = origem.current;
            if (!inicio) return;
            const andou =
              Math.abs(event.clientX - inicio.x) > LIMIAR_ARRASTO ||
              Math.abs(event.clientY - inicio.y) > LIMIAR_ARRASTO;
            if (andou) cancelarEspera();
          }}
          onPointerUp={cancelarEspera}
          onPointerCancel={cancelarEspera}
          onPointerLeave={cancelarEspera}
          // O menu nativo do sistema abriria no meio do gesto no Android e
          // engoliria o toque seguinte.
          onContextMenu={(event) => event.preventDefault()}
          onClick={() => {
            // O clique chega DEPOIS do temporizador ter aberto a fileira; sem
            // esta guarda, segurar abriria a fileira e reagiria ao mesmo tempo.
            if (abriuSegurando.current) {
              abriuSegurando.current = false;
              return;
            }
            escolher(mine ?? PRINCIPAL);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || (event.altKey && event.key === 'Enter')) {
              event.preventDefault();
              setAberta(true);
            }
          }}
          className={cn(
            'reacao-hover relative flex size-10 cursor-pointer items-center justify-center',
            'overflow-hidden rounded-pill disabled:cursor-not-allowed',
            // `touch-none` e `select-none`: sem eles, segurar no celular começa
            // a rolagem e a seleção de texto por cima do próprio gesto.
            'touch-none select-none',
            // Sem moldura quando não reagi: a borda em toda publicação de um
            // feed longo desenhava uma coluna de círculos vazios, e o que
            // precisa se destacar é a reação que EXISTE.
            mine
              ? 'bg-surface-subtle text-ink'
              : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
          )}
        >
          <span
            className={cn(
              'relative inline-flex',
              // Foguete decola; as outras pulsam. Aplicar a decolagem a um
              // aperto de mão seria movimento sem significado, e o ponto das
              // reações desta rede é cada uma dizer uma coisa diferente.
              pulsando && (escolhida === 'liftoff' ? 'reacao-decola' : 'reacao-escolhida'),
            )}
          >
            {/*
              A chave inclui o contador: trocar a chave remonta o ícone, e é o
              que faz o traço ser redesenhado a cada escolha em vez de animar
              só na primeira.
            */}
            <ReactionIcon
              key={`${mine ?? PRINCIPAL}-${desenho}`}
              reaction={mine ?? PRINCIPAL}
              className="size-5"
              colored={mine !== null}
              drawing={desenho > 0}
            />
          </span>
        </button>
      </div>

      {total > 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-ink-muted">
          <span className="flex gap-0.5">
            {presentes.map((reaction) => (
              <ReactionIcon key={reaction} reaction={reaction} className="size-3.5" colored />
            ))}
          </span>
          <span>{total}</span>
          <span className="sr-only">
            reações: {presentes.map((r) => `${counts[r]} ${REACTION_META[r].label}`).join(', ')}
          </span>
        </p>
      ) : null}
    </div>
  );
}
