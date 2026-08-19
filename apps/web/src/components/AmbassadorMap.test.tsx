import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guarda estrutural do mapa em tela cheia.
 *
 * O jsdom não calcula layout, então não dá para medir a altura renderizada — o
 * que dá para impedir é a causa da regressão: uma altura fixa no componente
 * vence o contêiner e deixa uma faixa vazia embaixo do mapa. Foi exatamente
 * isso que aconteceu na primeira versão.
 */
/**
 * Lê o arquivo pelo caminho do projeto.
 *
 * `import.meta.url` não serve aqui: sob o transformador do Vite ele é uma URL
 * `http`, não um caminho de arquivo. O diretório de trabalho varia conforme o
 * teste rode a partir da raiz do monorepo ou do pacote, então tentamos os dois.
 */
function lerFonte(relativo: string): string {
  const candidatos = [
    path.resolve(process.cwd(), 'src/components', relativo),
    path.resolve(process.cwd(), 'apps/web/src/components', relativo),
  ];

  const encontrado = candidatos.find((c) => existsSync(c));
  if (!encontrado) throw new Error(`não achei ${relativo} em: ${candidatos.join(', ')}`);

  return readFileSync(encontrado, 'utf8');
}

const mapa = lerFonte('AmbassadorMap.tsx');
const shell = lerFonte('AppShell.tsx');

/** Só as classes do JSX; comentários explicativos não contam. */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('mapa em tela cheia', () => {
  it('o mapa preenche o contêiner em vez de fixar a própria altura @spec:AC-064', () => {
    const codigo = semComentarios(mapa);

    expect(codigo).toContain('size-full');
    // Nenhuma altura fixa: `h-[28rem]`, `h-96` e afins voltam a criar a faixa
    // vazia que este teste existe para impedir.
    expect(codigo).not.toMatch(/className="[^"]*\bh-\[/);
    expect(codigo).not.toMatch(/className="[^"]*\bh-\d/);
  });

  it('a moldura reserva a altura da tela para o conteúdo sem margem @spec:AC-064', () => {
    const codigo = semComentarios(shell);

    // `dvh` e não `vh`: no celular, a barra do navegador muda a altura visível,
    // e `vh` deixaria o mapa passando por baixo dela.
    expect(codigo).toContain('dvh');
    expect(codigo).toContain('flex-1');
  });
});
