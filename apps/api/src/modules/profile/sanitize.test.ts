import { describe, expect, it } from 'vitest';
import { sanitizeList, sanitizeMultiline, sanitizeText } from './sanitize.js';

describe('sanitização de texto livre', () => {
  it('desarma HTML colado na bio, preservando o texto @spec:AC-010 @principle:P-006', () => {
    const resultado = sanitizeText('<img src=x onerror=alert(1)>Olá');

    expect(resultado).toBe('Olá');
    expect(resultado).not.toContain('<');
    expect(resultado).not.toContain('onerror');
  });

  it('remove script inteiro, inclusive o conteúdo', () => {
    expect(sanitizeText('antes<script>alert(1)</script>depois')).toBe('antesdepois');
  });

  it('remove tags mantendo o texto legível', () => {
    expect(sanitizeText('<b>Ana</b> — <i>UFPE</i>')).toBe('Ana — UFPE');
  });

  it('não deixa escapamento de entidade acumular a cada gravação', () => {
    // Sem a decodificação, salvar duas vezes viraria `&amp;amp;` na tela.
    const umaVez = sanitizeText('Pesquisa & Extensão');
    expect(umaVez).toBe('Pesquisa & Extensão');
    expect(sanitizeText(umaVez)).toBe('Pesquisa & Extensão');
  });

  it('normaliza espaços e quebras de linha', () => {
    expect(sanitizeText('  Ana   \n\n  Silva  ')).toBe('Ana Silva');
  });

  it('limpa cada habilidade e descarta as que ficaram vazias', () => {
    expect(sanitizeList(['<b>React</b>', '<script></script>', ' Go '])).toEqual(['React', 'Go']);
  });
});

describe('texto com parágrafos', () => {
  it('preserva a quebra de linha da publicação @spec:AC-143', () => {
    const escrito = 'primeiro parágrafo\nsegundo parágrafo\nterceiro';

    // Quem escrevia em parágrafos via tudo virar uma linha só: a causa não
    // estava na exibição, e sim aqui — `sanitizeText` achata `\s+` para espaço,
    // e a quebra de linha ia junto.
    expect(sanitizeMultiline(escrito)).toBe(escrito);
  });

  it('mantém uma linha em branco entre blocos @spec:AC-143', () => {
    expect(sanitizeMultiline('bloco um\n\nbloco dois')).toBe('bloco um\n\nbloco dois');
  });

  it('contém sequência abusiva de linhas vazias @spec:AC-144', () => {
    const abusivo = `topo${'\n'.repeat(40)}fundo`;

    // Sem teto, uma publicação com quarenta quebras empurraria o resto do feed
    // para fora da tela.
    expect(sanitizeMultiline(abusivo)).toBe('topo\n\nfundo');
  });

  it('colapsa espaço e tabulação, mas não a quebra de linha @spec:AC-143', () => {
    expect(sanitizeMultiline('a    b\tc\nd    e')).toBe('a b c\nd e');
  });

  it('não deixa espaço colado na borda da linha', () => {
    expect(sanitizeMultiline('linha um   \n   linha dois')).toBe('linha um\nlinha dois');
  });

  it('normaliza a quebra do Windows', () => {
    // Sem isto, `\r` sobra como caractere invisível no meio do texto.
    expect(sanitizeMultiline('um\r\ndois\rtrês')).toBe('um\ndois\ntrês');
  });

  it('continua removendo TODA marcação, como o de uma linha @principle:P-006', () => {
    const ataque = '<script>alert(1)</script>Olá\n<img src=x onerror=alert(2)>tudo bem';

    const limpo = sanitizeMultiline(ataque);

    expect(limpo).not.toContain('<');
    expect(limpo).not.toContain('script');
    expect(limpo).toContain('Olá');
    expect(limpo).toContain('tudo bem');
  });

  it('campo de uma linha continua achatado @spec:AC-145', () => {
    // Para nome, bio e rótulo de habilidade o achatamento é o comportamento
    // certo — o que mudou vale só para publicação e comentário.
    expect(sanitizeText('Ana\nRibeiro')).toBe('Ana Ribeiro');
  });
});
