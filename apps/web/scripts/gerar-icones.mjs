/**
 * Gera os ícones do aplicativo a partir do MESMO `logo.svg`.
 *
 * Roda à mão, e o resultado é versionado:
 *
 *   node scripts/gerar-icones.mjs
 *
 * Por que gerar em vez de desenhar: um conjunto de ícones feito à parte começa
 * igual à marca e termina diferente dela — basta um ajuste no traço que ninguém
 * replica. Saindo do mesmo arquivo, divergir deixa de ser possível.
 *
 * ## O ícone "maskable" tem margem, e isso não é estética
 *
 * O Android recorta o ícone em formas diferentes por fabricante: círculo,
 * quadrado arredondado, gota. A área garantida é um círculo central com 80% do
 * lado — tudo fora dela PODE ser cortado. Sem a margem, o "C" da marca perde as
 * pontas em metade dos aparelhos.
 *
 * Por isso são dois arquivos: o normal, que usa a arte inteira, e o adaptável,
 * com a arte reduzida a 60% sobre fundo sólido.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ORIGEM = resolve(AQUI, '../public/logo.svg');
const DESTINO = resolve(AQUI, '../public/icons');

/** O mesmo `--color-surface` do tema claro: o ícone não é transparente. */
const FUNDO = { r: 255, g: 255, b: 255, alpha: 1 };

const svg = await readFile(ORIGEM);
await mkdir(DESTINO, { recursive: true });

async function gerar(nome, lado, escala) {
  const arte = Math.round(lado * escala);
  const margem = Math.round((lado - arte) / 2);

  const desenho = await sharp(svg, { density: 384 }).resize(arte, arte).png().toBuffer();

  await sharp({
    create: { width: lado, height: lado, channels: 4, background: FUNDO },
  })
    .composite([{ input: desenho, top: margem, left: margem }])
    .png()
    .toFile(resolve(DESTINO, nome));

  return nome;
}

const gerados = await Promise.all([
  // Arte com um respiro pequeno: estes aparecem inteiros.
  gerar('icone-192.png', 192, 0.82),
  gerar('icone-512.png', 512, 0.82),
  // Adaptável: 60% garante que nada essencial caia fora da área segura.
  gerar('icone-maskable-512.png', 512, 0.6),
  // Apple ignora o manifesto e usa esta, sem transparência.
  gerar('apple-touch-icon.png', 180, 0.8),
]);

console.log(`ícones gerados em public/icons/: ${gerados.join(', ')}`);
