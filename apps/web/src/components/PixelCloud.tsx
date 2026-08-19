import { useEffect, useRef } from 'react';

/** Espaçamento da malha, em pixels de CSS. Menor = mais pontos e mais trabalho. */
const PASSO = 26;

/** Teto de pontos. Numa tela ultrawide a malha passaria de dez mil sem ele. */
const MAXIMO_PONTOS = 2200;

/** Até onde o cursor empurra. */
const ALCANCE = 130;

/** Quanto o ponto volta para o lugar a cada quadro — a "mola" do movimento. */
const RETORNO = 0.055;

/** Atrito: sem ele o ponto oscila em torno da origem para sempre. */
const ATRITO = 0.86;

interface Ponto {
  origemX: number;
  origemY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Fase própria, para a deriva não acontecer em uníssono. */
  fase: number;
  brilho: number;
}

/**
 * A nuvem de pixels da página de apresentação.
 *
 * Uma malha de pontos que deriva sozinha e **se afasta do cursor** — a linguagem
 * do antigravity.google, de onde este design system veio.
 *
 * Canvas 2D e nenhuma biblioteca: o efeito é uma malha, uma força de repulsão e
 * uma mola de retorno. Uma dependência de partículas pesaria mais que o recurso
 * numa página que precisa abrir rápido para quem chegou por um link de convite.
 *
 * Quatro cuidados decidem se isto é bonito ou um aparelho esquentando:
 *
 * 1. **Densidade proporcional à área, com teto.** Contagem fixa vira travamento
 *    numa tela grande e desperdício num celular.
 * 2. **O laço para quando a aba sai de foco.** Animação em aba escondida é
 *    bateria queimada para ninguém ver.
 * 3. **`prefers-reduced-motion` desliga tudo** — e aí desenhamos a malha uma vez,
 *    parada, em vez de mostrar um retângulo vazio.
 * 4. **`pointer-events: none`.** A nuvem cobre a área do título; sem isso ela
 *    roubaria o clique dos botões que estão por cima dela.
 */
export function PixelCloud({ className }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const elemento = canvas.current;
    if (!elemento) return;

    const contexto = elemento.getContext('2d');
    if (!contexto) return;

    // Cópias com tipo estreitado: as funções abaixo são declaradas com `function`
    // e o TypeScript não carrega a checagem de nulo para dentro delas.
    const tela = elemento;
    const ctx = contexto;

    const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let pontos: Ponto[] = [];
    let quadro = 0;
    let tempo = 0;
    const cursor = { x: -9999, y: -9999 };

    /** Lê a cor do texto secundário: a nuvem acompanha o tema sem saber dele. */
    const corDaTinta = () =>
      getComputedStyle(tela).getPropertyValue('color').trim() || 'rgb(120,120,120)';

    function montar() {
      const largura = tela.clientWidth;
      const altura = tela.clientHeight;
      if (largura === 0 || altura === 0) return;

      // `devicePixelRatio` limitado a 2: acima disso o ganho visual é nulo e o
      // número de pixels a pintar cresce ao quadrado.
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      tela.width = Math.round(largura * escala);
      tela.height = Math.round(altura * escala);
      ctx.setTransform(escala, 0, 0, escala, 0, 0);

      const colunas = Math.ceil(largura / PASSO);
      const linhas = Math.ceil(altura / PASSO);
      const passo = colunas * linhas > MAXIMO_PONTOS
        ? PASSO * Math.sqrt((colunas * linhas) / MAXIMO_PONTOS)
        : PASSO;

      pontos = [];
      for (let x = passo / 2; x < largura; x += passo) {
        for (let y = passo / 2; y < altura; y += passo) {
          pontos.push({
            origemX: x,
            origemY: y,
            x,
            y,
            vx: 0,
            vy: 0,
            fase: Math.random() * Math.PI * 2,
            brilho: 0.25 + Math.random() * 0.5,
          });
        }
      }
    }

    function desenhar() {
      const largura = tela.clientWidth;
      const altura = tela.clientHeight;
      ctx.clearRect(0, 0, largura, altura);
      ctx.fillStyle = corDaTinta();

      for (const ponto of pontos) {
        ctx.globalAlpha = ponto.brilho;
        ctx.beginPath();
        ctx.arc(ponto.x, ponto.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function passoDaAnimacao() {
      tempo += 0.006;

      for (const ponto of pontos) {
        // Deriva própria: uma senoide por eixo, com fase distinta em cada ponto.
        const derivaX = Math.cos(tempo + ponto.fase) * 1.6;
        const derivaY = Math.sin(tempo * 0.85 + ponto.fase) * 1.6;

        const alvoX = ponto.origemX + derivaX;
        const alvoY = ponto.origemY + derivaY;

        const dx = ponto.x - cursor.x;
        const dy = ponto.y - cursor.y;
        const distancia = Math.hypot(dx, dy);

        if (distancia < ALCANCE && distancia > 0.01) {
          // Empurrão mais forte perto do cursor e nulo na borda do alcance —
          // uma força constante daria um "degrau" visível no limite.
          const forca = (1 - distancia / ALCANCE) ** 2 * 5;
          ponto.vx += (dx / distancia) * forca;
          ponto.vy += (dy / distancia) * forca;
        }

        ponto.vx = (ponto.vx + (alvoX - ponto.x) * RETORNO) * ATRITO;
        ponto.vy = (ponto.vy + (alvoY - ponto.y) * RETORNO) * ATRITO;
        ponto.x += ponto.vx;
        ponto.y += ponto.vy;
      }

      desenhar();
      quadro = window.requestAnimationFrame(passoDaAnimacao);
    }

    function comecar() {
      if (menosMovimento || document.hidden || quadro !== 0) return;
      quadro = window.requestAnimationFrame(passoDaAnimacao);
    }

    function parar() {
      if (quadro !== 0) window.cancelAnimationFrame(quadro);
      quadro = 0;
    }

    const aoMover = (event: PointerEvent) => {
      const caixa = tela.getBoundingClientRect();
      cursor.x = event.clientX - caixa.left;
      cursor.y = event.clientY - caixa.top;
    };

    const aoSair = () => {
      cursor.x = -9999;
      cursor.y = -9999;
    };

    const aoTrocarVisibilidade = () => (document.hidden ? parar() : comecar());

    montar();
    desenhar();
    comecar();

    const observador = new ResizeObserver(() => {
      montar();
      desenhar();
    });
    observador.observe(tela);

    // O ponteiro é ouvido na JANELA, não no canvas: o canvas tem
    // `pointer-events: none` para não roubar o clique dos botões, e por isso
    // não recebe evento nenhum.
    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerleave', aoSair);
    document.addEventListener('visibilitychange', aoTrocarVisibilidade);

    return () => {
      parar();
      observador.disconnect();
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerleave', aoSair);
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      // Decoração pura: `aria-hidden` e sem eventos de ponteiro.
      className={`pointer-events-none text-ink-muted ${className ?? ''}`}
    />
  );
}
