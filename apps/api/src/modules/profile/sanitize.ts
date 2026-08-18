import sanitizeHtml from 'sanitize-html';

/**
 * Neutraliza texto livre antes de gravar (P-006, AC-010).
 *
 * A bio é texto puro, não conteúdo rico: a política correta é remover TODAS as
 * tags, não tentar listar as perigosas. Lista de bloqueio sempre fica para trás
 * do próximo vetor; lista de permissão vazia, não.
 *
 * Isto acontece na ENTRADA, antes do banco. Sanitizar só na exibição deixa
 * carga ativa guardada, esperando o dia em que alguém renderizar o campo por
 * outro caminho — uma exportação, um e-mail, uma prévia de link.
 */
export function sanitizeText(input: string): string {
  const withoutMarkup = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    // Sem isto, `<img src=x onerror=...>Olá` viraria `Olá` e a remoção passaria
    // despercebida; queremos que o conteúdo textual sobreviva, não o markup.
    disallowedTagsMode: 'discard',
  });

  // O sanitizador escapa entidades HTML; decodificamos de volta porque o
  // destino é um campo de texto, e o SPA renderiza como texto.
  const decoded = withoutMarkup
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

  return decoded.replace(/\s+/g, ' ').trim();
}

/** Mesma limpeza para cada item de uma lista curta (habilidades, rótulos de link). */
export function sanitizeList(values: readonly string[]): string[] {
  return values.map(sanitizeText).filter((value) => value.length > 0);
}
