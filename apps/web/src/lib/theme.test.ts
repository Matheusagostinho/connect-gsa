import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyStoredThemeEagerly } from './theme.js';

/**
 * O tema é uma escolha que precisa sobreviver ao recarregamento — e "seguir o
 * sistema" precisa continuar alcançável depois de o usuário ter escolhido algo.
 *
 * O ponto sutil que estes testes protegem: "seguir o sistema" REMOVE o atributo
 * em vez de calcular claro ou escuro em JavaScript. Se calculássemos, o tema
 * ficaria congelado no valor do momento do carregamento e deixaria de acompanhar
 * o sistema operacional com a aba já aberta.
 */
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  localStorage.clear();
});

describe('tema', () => {
  it('abre no tema escolhido depois de recarregar @spec:AC-022', () => {
    localStorage.setItem('connect-gsa-theme', 'dark');

    applyStoredThemeEagerly();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('deixa o sistema decidir quando não há escolha guardada @spec:AC-022', () => {
    applyStoredThemeEagerly();

    // Sem atributo: quem manda é a media query do CSS.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('ignora valor inválido guardado, em vez de aplicar lixo na página', () => {
    localStorage.setItem('connect-gsa-theme', 'roxo-neon');

    applyStoredThemeEagerly();

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('não guarda credencial nenhuma junto da preferência @principle:P-008', () => {
    localStorage.setItem('connect-gsa-theme', 'light');
    applyStoredThemeEagerly();

    const chaves = Object.keys(localStorage);
    expect(chaves).toEqual(['connect-gsa-theme']);
    expect(chaves.join()).not.toMatch(/token|session|jwt|auth/i);
  });
});
