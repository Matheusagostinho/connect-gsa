import { Fragment } from 'react';

/**
 * Texto de post e comentário, com os links clicáveis.
 *
 * Por que existe: o conteúdo é gravado como TEXTO PURO — sanitizado no servidor
 * antes de entrar no banco (P-006). Isso é o que impede injeção, e é para
 * continuar assim. Então o link não pode vir pronto do banco: ele é reconhecido
 * aqui, na exibição, e transformado em elemento pelo React — que escapa o
 * conteúdo por construção.
 *
 * O que NÃO fazemos: `dangerouslySetInnerHTML`. Seria o caminho curto e
 * reabriria exatamente o buraco que a sanitização fechou.
 */

/** Reconhece http(s) e domínios escritos sem protocolo. */
const PADRAO = /(https?:\/\/[^\s<]+|(?<![@\w])www\.[^\s<]+)/gi;

/** Sem protocolo o navegador trataria como caminho relativo. */
function paraHref(bruto: string): string {
  return bruto.startsWith('http') ? bruto : `https://${bruto}`;
}

/**
 * Encurta o que é exibido, preservando o destino.
 *
 * Uma URL de busca do Google tem centenas de caracteres e, inteira, empurra o
 * cartão e domina a publicação. Mostramos o domínio e o começo do caminho; o
 * endereço completo continua no `title` e no destino do link.
 */
function paraTexto(bruto: string): string {
  if (bruto.length <= 48) return bruto;

  try {
    const url = new URL(paraHref(bruto));
    const caminho = `${url.pathname}${url.search}`;
    const resumo = caminho.length > 18 ? `${caminho.slice(0, 17)}…` : caminho;
    return `${url.host}${resumo === '/' ? '' : resumo}`;
  } catch {
    return `${bruto.slice(0, 47)}…`;
  }
}

export function RichText({ text }: { text: string }) {
  const partes = text.split(PADRAO);

  return (
    <>
      {partes.map((parte, indice) => {
        if (!parte) return null;

        // O split com grupo de captura devolve os separadores nas posições
        // ímpares — são eles os links.
        const ehLink = indice % 2 === 1;
        if (!ehLink) return <Fragment key={indice}>{parte}</Fragment>;

        return (
          <a
            key={indice}
            href={paraHref(parte)}
            title={parte}
            target="_blank"
            // `noopener` impede a página aberta de mexer nesta; `nofollow`
            // evita que a rede empreste reputação a link colado por qualquer um.
            rel="noopener noreferrer nofollow"
            className="font-medium text-ink underline decoration-border underline-offset-2 hover:decoration-ink"
          >
            {paraTexto(parte)}
          </a>
        );
      })}
    </>
  );
}
