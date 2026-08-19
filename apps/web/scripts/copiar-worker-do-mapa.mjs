#!/usr/bin/env node
/**
 * Copia o worker do MapLibre — e o módulo irmão de que ele depende.
 *
 * O MapLibre carrega tiles vetoriais num Web Worker, e o arquivo do worker faz
 * `import './maplibre-gl-shared.mjs'`. Deixar o empacotador cuidar disso não
 * funciona: com `?url` ele copia só o worker, o irmão fica de fora, e o import
 * falha DENTRO do worker — onde o erro não chega ao console da página.
 *
 * O sintoma dessa falha é traiçoeiro: estilo e sprites vêm da thread principal
 * e carregam normalmente, então o mapa aparece na tela. Cinza, sem um único
 * tile, sem aviso nenhum.
 *
 * Copiar os dois para `public/` mantém a relação entre eles: ficam lado a lado,
 * servidos como estão, e o import relativo resolve.
 */
import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ARQUIVOS = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];

const distMapLibre = path.dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'));
const destino = fileURLToPath(new URL('../public/maplibre/', import.meta.url));

await mkdir(destino, { recursive: true });

for (const arquivo of ARQUIVOS) {
  await cp(path.join(distMapLibre, arquivo), path.join(destino, arquivo));
}

process.stdout.write(`worker do mapa copiado para public/maplibre/ (${ARQUIVOS.length} arquivos)\n`);
