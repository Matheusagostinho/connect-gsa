import { describe, expect, it } from 'vitest';
import { LINK_FIELDS, fieldsToLinks, linksToFields } from './links.js';

describe('campos de link do perfil', () => {
  it('guarda só o que foi preenchido, e nunca um link vazio @spec:AC-120', () => {
    const links = fieldsToLinks({ github: 'https://github.com/ana', portfolio: '  ' });

    // Um `{label: "Portfólio", url: ""}` faria a validação de https falhar no
    // servidor, e a pessoa não conseguiria salvar por causa de um campo que ela
    // nem quis preencher.
    expect(links).toEqual([{ label: 'GitHub', url: 'https://github.com/ana' }]);
  });

  it('devolve os cinco campos conhecidos ao ler o perfil @spec:AC-120', () => {
    const campos = linksToFields([
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ana' },
      { label: 'TikTok', url: 'https://tiktok.com/@ana' },
    ]);

    expect(campos.linkedin).toBe('https://linkedin.com/in/ana');
    expect(campos.tiktok).toBe('https://tiktok.com/@ana');
    expect(campos.github).toBe('');
  });

  it('ida e volta preserva o que foi guardado @spec:AC-120', () => {
    const original = {
      github: 'https://github.com/ana',
      portfolio: '',
      linkedin: 'https://linkedin.com/in/ana',
      instagram: '',
      tiktok: '',
    };

    expect(linksToFields(fieldsToLinks(original))).toEqual(original);
  });

  it('ignora rótulo desconhecido em vez de perdê-lo num campo errado', () => {
    // Link antigo, cadastrado quando o rótulo era livre. Ele continua no banco;
    // só não aparece nos cinco campos.
    const campos = linksToFields([{ label: 'Meu blog', url: 'https://blog.ana.dev' }]);

    expect(Object.values(campos).every((v) => v === '')).toBe(true);
  });

  it('cinco campos, tantos quantos o limite do perfil permite', () => {
    expect(LINK_FIELDS).toHaveLength(5);
  });
});
