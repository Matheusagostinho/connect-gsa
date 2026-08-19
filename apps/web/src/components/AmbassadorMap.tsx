import type { MapCity } from '@connect-gsa/shared';
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * O worker vem de `public/`, copiado por `scripts/copiar-worker-do-mapa.mjs`.
 *
 * Ele importa um módulo irmão (`maplibre-gl-shared.mjs`), e é por isso que o
 * par precisa ser servido lado a lado, sem passar pelo empacotador — que
 * copiaria só um dos dois e deixaria o import quebrar dentro do worker, em
 * silêncio.
 */
setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

/**
 * O mapa dos embaixadores.
 *
 * Escolhas que não são de gosto:
 *
 * - **MapLibre com tiles do OpenFreeMap.** MapLibre é BSD-2 e o OpenFreeMap
 *   serve sem chave de API, sem cadastro e **sem cookies** — numa rede de
 *   estudantes, não introduzir um rastreador de terceiros importa mais do que
 *   qualquer conveniência. O Mapbox GL virou licença proprietária na versão 2 e
 *   exigiria token com faturamento.
 * - **Um pino por CIDADE, nunca por pessoa.** Não é agrupamento visual: a API
 *   não devolve posição individual porque ela não existe no sistema (P-001). Um
 *   pino por pessoa exigiria inventar coordenadas — que é exatamente o que a
 *   constituição proíbe.
 * - **Marcadores em HTML, não em camada do WebGL.** São dezenas de pontos, não
 *   milhares, e HTML dá foto, foco por teclado e leitor de tela de graça.
 */

const ESTILO = 'https://tiles.openfreemap.org/styles/positron';

/** Enquadramento inicial: o Brasil inteiro. */
const BRASIL: [[number, number], [number, number]] = [
  [-74, -34],
  [-34, 6],
];

/** Centro e zoom de partida, usados antes de o contêiner ter tamanho medido. */
const CENTRO_BRASIL: [number, number] = [-54, -14];
const ZOOM_BRASIL = 3;

function criarPino(cidade: MapCity, aoClicar: () => void): HTMLElement {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.setAttribute(
    'aria-label',
    `${cidade.city}/${cidade.state}: ${cidade.count} ${cidade.count === 1 ? 'embaixador' : 'embaixadores'}`,
  );
  botao.className = 'pino-mapa';
  botao.addEventListener('click', aoClicar);

  const fotos = document.createElement('span');
  fotos.className = 'pino-mapa-fotos';
  fotos.setAttribute('aria-hidden', 'true');

  for (const pessoa of cidade.preview) {
    if (pessoa.imageUrl) {
      const img = document.createElement('img');
      img.src = pessoa.imageUrl;
      img.alt = '';
      img.loading = 'lazy';
      fotos.append(img);
    } else {
      const inicial = document.createElement('span');
      inicial.className = 'pino-mapa-inicial';
      inicial.textContent = pessoa.name.charAt(0).toUpperCase();
      fotos.append(inicial);
    }
  }

  const rotulo = document.createElement('span');
  rotulo.className = 'pino-mapa-rotulo';
  rotulo.setAttribute('aria-hidden', 'true');
  rotulo.textContent = cidade.count > cidade.preview.length ? `+${cidade.count - cidade.preview.length}` : cidade.city;

  botao.append(fotos, rotulo);
  return botao;
}

export function AmbassadorMap({
  cities,
  onSelectCity,
}: {
  cities: MapCity[];
  onSelectCity: (cityId: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapLibreMap | null>(null);
  const marcadores = useRef<Marker[]>([]);

  useEffect(() => {
    if (!container.current || mapa.current) return;

    const instancia = new MapLibreMap({
      container: container.current,
      style: ESTILO,
      // Centro e zoom explícitos em vez de `bounds` na construção.
      //
      // `bounds` é resolvido no momento em que o mapa nasce, e nesse instante o
      // contêiner ainda pode ter altura zero — o enquadramento calculado sai
      // inválido e o mapa termina apontando para lugar nenhum, sem pedir tile
      // algum. O ajuste para o Brasil acontece abaixo, depois de medir.
      center: CENTRO_BRASIL,
      zoom: ZOOM_BRASIL,
      // Rotacionar um mapa de pontos só serve para desorientar.
      pitchWithRotate: false,
      dragRotate: false,
      attributionControl: { compact: true },
    });

    // Embaixo, e não em cima: no celular a marca e a conta flutuam no topo do
    // mapa, e o zoom ali cairia por cima do avatar.
    instancia.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    instancia.once('load', () => {
      instancia.resize();
      instancia.fitBounds(BRASIL, { padding: 40, animate: false });
    });

    // O contêiner cresce com a tela (e com a barra lateral do navegador). Sem
    // observar, o mapa fica com o tamanho do primeiro quadro para sempre.
    const observador = new ResizeObserver(() => instancia.resize());
    observador.observe(container.current);

    mapa.current = instancia;

    return () => {
      observador.disconnect();
      instancia.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) return;

    for (const marcador of marcadores.current) marcador.remove();
    marcadores.current = cities.map((cidade) =>
      new Marker({ element: criarPino(cidade, () => onSelectCity(cidade.cityId)) })
        .setLngLat([cidade.longitude, cidade.latitude])
        .addTo(instancia),
    );
  }, [cities, onSelectCity]);

  return (
    <div
      ref={container}
      role="application"
      aria-label="Mapa dos embaixadores por cidade"
      // Altura vem do contêiner, não daqui: o mapa preenche o espaço que a
      // página reservou para ele (AC-064). Fixá-la aqui faria a página perder
      // o controle e sobrar uma faixa vazia embaixo.
      className="size-full"
    />
  );
}
