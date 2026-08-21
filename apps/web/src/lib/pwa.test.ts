import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * O contrato do aplicativo instalável.
 *
 * Estrutural de propósito: manifesto e service worker não passam pelo
 * empacotador nem pelo TypeScript, então nada os verifica — um campo removido
 * por engano só apareceria no dia em que alguém tentasse instalar.
 */
const raiz = join(import.meta.dirname, '../../public');
const manifesto = JSON.parse(readFileSync(join(raiz, 'manifest.webmanifest'), 'utf8')) as {
  name: string;
  start_url: string;
  display: string;
  theme_color: string;
  icons: { src: string; sizes: string; purpose?: string }[];
};
const sw = readFileSync(join(raiz, 'sw.js'), 'utf8');

describe('manifesto do aplicativo', () => {
  it('descreve um aplicativo instalável @spec:AC-155', () => {
    expect(manifesto.name).toBe('ConnectGSA');
    expect(manifesto.start_url).toBe('/');
    // `standalone` é o que faz abrir sem a barra do navegador — sem ele o
    // atalho vira um marcador comum.
    expect(manifesto.display).toBe('standalone');
    expect(manifesto.theme_color).toMatch(/^#/);
  });

  it('traz os três ícones que a instalação exige @spec:AC-155', () => {
    const tamanhos = manifesto.icons.map((i) => i.sizes);
    expect(tamanhos).toContain('192x192');
    expect(tamanhos).toContain('512x512');

    // O adaptável é o que impede o Android de cortar as pontas da marca ao
    // recortar em círculo, quadrado arredondado ou gota.
    expect(manifesto.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });
});

describe('service worker', () => {
  it('recua para a moldura quando não há rede @spec:AC-156', () => {
    // Sem este recuo, abrir sem conexão mostra a página de erro do navegador.
    expect(sw).toMatch(/mode === 'navigate'/);
    expect(sw).toMatch(/caches\.match\('\/index\.html'\)/);
  });

  it('NUNCA guarda resposta da API @principle:P-012', () => {
    // Decisão de privacidade, não de desempenho: um perfil em cache
    // sobreviveria a uma exclusão de conta — o titular pediu para sumir e
    // continuaria aparecendo.
    expect(sw).toMatch(/pathname\.startsWith\('\/api\/'\)/);
  });

  it('só intercepta GET da própria origem', () => {
    // POST nunca deve sair do cache, e tile de mapa não é assunto deste worker.
    expect(sw).toMatch(/method !== 'GET'/);
    expect(sw).toMatch(/origin !== self\.location\.origin/);
  });
});
