import type { Link } from './profile.schema.js';

/**
 * As redes que o perfil oferece como campo pronto.
 *
 * Campos fixos em vez de uma lista livre de rótulo e endereço: quem preenche não
 * precisa inventar como escrever "LinkedIn", e quem lê encontra sempre o mesmo
 * nome. O armazenamento continua sendo a lista de `{label, url}` que já existe —
 * nada precisou mudar no banco, e nenhum link já cadastrado se perdeu.
 *
 * O domínio NÃO é validado. Prender o campo do GitHub a `github.com` parece
 * rigor e só atrapalha quem usa GitHub Enterprise ou domínio próprio; a defesa
 * que importa — exigir `https` e marcar `nofollow noopener` na exibição — já
 * está no `linkSchema` e no componente.
 */
export const LINK_FIELDS = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/seu-usuario' },
  { key: 'portfolio', label: 'Portfólio', placeholder: 'https://seusite.com' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/seu-perfil' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/seu-usuario' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@seu-usuario' },
] as const;

export type LinkFieldKey = (typeof LINK_FIELDS)[number]['key'];

/** A lista guardada, lida como os cinco campos conhecidos. */
export function linksToFields(links: readonly Link[]): Record<LinkFieldKey, string> {
  const campos = Object.fromEntries(LINK_FIELDS.map((f) => [f.key, ''])) as Record<
    LinkFieldKey,
    string
  >;

  for (const link of links) {
    const campo = LINK_FIELDS.find((f) => f.label.toLowerCase() === link.label.toLowerCase());
    if (campo) campos[campo.key] = link.url;
  }

  return campos;
}

/**
 * Os cinco campos, de volta à lista guardada.
 *
 * Campo em branco não vira link vazio — ele simplesmente não entra. Guardar
 * `{label: 'TikTok', url: ''}` faria a validação de `https` falhar no servidor e
 * a pessoa não conseguiria salvar o perfil por causa de um campo que ela nem
 * quis preencher.
 */
export function fieldsToLinks(campos: Partial<Record<LinkFieldKey, string>>): Link[] {
  return LINK_FIELDS.flatMap((campo) => {
    const url = campos[campo.key]?.trim();
    return url ? [{ label: campo.label, url }] : [];
  });
}
