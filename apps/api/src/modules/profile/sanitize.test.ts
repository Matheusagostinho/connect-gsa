import { describe, expect, it } from 'vitest';
import { sanitizeList, sanitizeText } from './sanitize.js';

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
