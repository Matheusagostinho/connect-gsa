import { randomUUID } from 'node:crypto';

/**
 * Onde as imagens ficam guardadas.
 *
 * A interface existe porque os dois ambientes têm necessidades incompatíveis:
 * em produção o destino é o Cloudflare R2, e em desenvolvimento não há (nem
 * deveria haver) credencial de nuvem só para você testar um upload. Sem esta
 * costura, ou o ambiente local exigiria uma conta em algum provedor, ou o
 * código de produção teria um `if` sobre ambiente espalhado por dentro.
 *
 * Ela já provou o valor uma vez: a troca de Cloud Storage por R2 foi um arquivo
 * novo e uma linha no `app.ts`. Nenhuma rota, nenhum serviço e nenhuma linha do
 * banco souberam que o provedor mudou.
 *
 * A CHAVE é o que fica no banco; a URL é montada na saída. Trocar de provedor
 * não deveria exigir reescrever linhas da tabela de posts.
 */
export interface StorageDriver {
  /** Grava o objeto e devolve a chave dele. */
  save(key: string, data: Buffer, contentType: string): Promise<void>;
  /** URL pública de leitura para uma chave. */
  urlFor(key: string): string;
  remove(key: string): Promise<void>;
}

/** Gera uma chave imprevisível — o nome do arquivo enviado nunca é reaproveitado. */
export function buildStorageKey(prefix: 'posts' | 'avatars', extension: string): string {
  const now = new Date();
  const pasta = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  // Nome vindo do cliente nunca entra na chave: seria caminho para travessia de
  // diretório e para colisão proposital entre arquivos de pessoas diferentes.
  return `${prefix}/${pasta}/${randomUUID()}.${extension}`;
}
