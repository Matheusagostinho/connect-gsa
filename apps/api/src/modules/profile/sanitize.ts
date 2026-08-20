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

/**
 * Até quantas quebras de linha seguidas sobrevivem.
 *
 * DUAS quebras, o que deixa UMA linha em branco entre os blocos — não duas.
 * A distinção parece pedante e não é: uma linha em branco já separa seções, e
 * o nome anterior (`LINHAS_VAZIAS_MAX`) dizia "linhas vazias" enquanto contava
 * quebras, então lê-lo levava ao dobro do que o código faz.
 */
const QUEBRAS_SEGUIDAS_MAX = 2;

/**
 * A mesma limpeza, para texto que tem PARÁGRAFOS.
 *
 * `sanitizeText` termina com `\s+ → ' '`, e isso achata quebra de linha junto:
 * quem escrevia uma publicação em três parágrafos via tudo virar uma linha só.
 * Para nome, bio e rótulo de habilidade — campos de uma linha — esse
 * achatamento é o certo; para publicação e comentário, destrói o conteúdo.
 *
 * O que muda: espaços e tabulações continuam sendo colapsados, mas a quebra de
 * linha sobrevive. Sequências de quebras são limitadas a duas, o que deixa uma
 * linha em branco entre blocos — sem o teto, uma publicação com duzentas
 * quebras empurraria todo o resto do feed para fora da tela, e isso é abuso
 * barato demais para deixar aberto.
 *
 * A política de tags continua sendo lista de PERMISSÃO vazia: remover todas, em
 * vez de tentar enumerar as perigosas (P-006).
 */
export function sanitizeMultiline(input: string): string {
  const withoutMarkup = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  });

  const decoded = withoutMarkup
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

  return (
    decoded
      // Normaliza a quebra do Windows antes de qualquer contagem, senão `\r`
      // sobra como caractere invisível no meio do texto.
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n')
      // Espaço e tabulação colapsam; a quebra de linha, não. `[^\S\n]` é
      // "espaço em branco que não é quebra de linha".
      .replace(/[^\S\n]+/g, ' ')
      // Espaço colado na borda da linha não é conteúdo, é resíduo de digitação.
      .replace(/ *\n */g, '\n')
      .replace(
        new RegExp(`\n{${QUEBRAS_SEGUIDAS_MAX + 1},}`, 'g'),
        '\n'.repeat(QUEBRAS_SEGUIDAS_MAX),
      )
      .trim()
  );
}

/** Mesma limpeza para cada item de uma lista curta (habilidades, rótulos de link). */
export function sanitizeList(values: readonly string[]): string[] {
  return values.map(sanitizeText).filter((value) => value.length > 0);
}
