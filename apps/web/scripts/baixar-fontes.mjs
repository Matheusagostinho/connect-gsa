/**
 * Baixa a Google Sans do Google Fonts para dentro de `public/fonts/`.
 *
 * Roda À MÃO, não no build: o resultado é versionado. Um build que depende de
 * uma rede externa falha no dia em que ela cai, e "não compila hoje porque o
 * Google Fonts está fora" é um jeito ruim de descobrir isso.
 *
 *   node scripts/baixar-fontes.mjs
 *
 * Por que servir do próprio domínio, e não do CDN do Google: numa rede de
 * estudantes, cada visita batendo no `fonts.googleapis.com` entrega IP e
 * User-Agent a um terceiro. Foi exatamente esse o argumento que escolheu o
 * OpenFreeMap para o mapa, e deixar a fonte de fora seria manter a incoerência.
 *
 * Só os subsets LATINOS. O CSS do Google descreve trinta, de adlam a telugu; um
 * navegador só baixa o que a página usa, mas versionar trinta arquivos para
 * usar dois é peso morto no repositório.
 *
 * A licença permite: a Google Sans está sob SIL Open Font License desde
 * janeiro de 2026, e a OFL exige apenas que a licença acompanhe os arquivos —
 * ver `public/fonts/OFL.txt`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const DESTINO = resolve(AQUI, '../public/fonts');

const FAMILIAS = 'family=Google+Sans:wght@400..700&family=Google+Sans+Code:wght@400;500';

// Sem o User-Agent de navegador moderno, o Google devolve `.ttf` em vez de
// `.woff2` — um arquivo várias vezes maior, por compatibilidade com navegador
// que não temos.
const NAVEGADOR =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SUBSETS_QUE_USAMOS = new Set(['latin', 'latin-ext']);

function nomeDoArquivo(familia, peso, subset) {
  const base = familia.toLowerCase().replaceAll(' ', '-');
  return `${base}-${peso.replaceAll(' ', '-')}-${subset}.woff2`;
}

async function baixar(url) {
  const resposta = await fetch(url, { headers: { 'User-Agent': NAVEGADOR } });
  if (!resposta.ok) throw new Error(`${resposta.status} ao baixar ${url}`);
  return resposta;
}

const css = await (await baixar(`https://fonts.googleapis.com/css2?${FAMILIAS}&display=swap`)).text();

await mkdir(DESTINO, { recursive: true });

const blocos = [...css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face \{[\s\S]*?\})/g)];
const saida = [];
let bytes = 0;

for (const [, subset, bloco] of blocos) {
  if (!SUBSETS_QUE_USAMOS.has(subset)) continue;

  const familia = /font-family: '([^']+)'/.exec(bloco)[1];
  const peso = /font-weight: ([^;]+);/.exec(bloco)[1];
  const intervalo = /unicode-range: ([^;]+);/.exec(bloco)[1];
  const remota = /src: url\(([^)]+)\)/.exec(bloco)[1];

  const arquivo = nomeDoArquivo(familia, peso, subset);
  const corpo = Buffer.from(await (await baixar(remota)).arrayBuffer());
  await writeFile(resolve(DESTINO, arquivo), corpo);
  bytes += corpo.length;

  saida.push(
    `/* ${subset} */\n@font-face {\n` +
      `  font-family: '${familia}';\n` +
      `  font-style: normal;\n` +
      `  font-weight: ${peso};\n` +
      // `swap` e não `block`: o texto aparece na fonte do sistema e troca quando
      // a Google Sans chega. Bloquear deixaria a tela em branco no 3G ruim.
      `  font-display: swap;\n` +
      `  src: url('/fonts/${arquivo}') format('woff2');\n` +
      `  unicode-range: ${intervalo};\n}`,
  );
}

const cabecalho = `/*
 * GERADO por scripts/baixar-fontes.mjs — não edite à mão.
 *
 * Google Sans sob SIL Open Font License (ver OFL.txt nesta pasta). Servida do
 * próprio domínio para que nenhuma visita entregue IP a um terceiro.
 */\n\n`;

await writeFile(resolve(DESTINO, 'fontes.css'), cabecalho + saida.join('\n\n') + '\n');

console.log(`${saida.length} arquivo(s), ${(bytes / 1024).toFixed(1)} KB em public/fonts/`);
