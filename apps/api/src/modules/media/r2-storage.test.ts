import { afterEach, describe, expect, it, vi } from 'vitest';
import { R2StorageDriver } from './r2-storage.js';

/**
 * O driver do R2, exercitado pelo `fetch` — que é por onde ele fala.
 *
 * `aws4fetch` assina a requisição e entrega ao `fetch` global, então trocar o
 * global é o ponto de costura honesto: o que se observa aqui é exatamente o que
 * sairia pela rede, assinatura inclusa.
 */
function comFetchFalso(resposta: Response) {
  const chamadas: Array<{ url: string; init: RequestInit }> = [];

  vi.stubGlobal('fetch', (entrada: Request | string, init: RequestInit = {}) => {
    // O `aws4fetch` monta um `Request` assinado; é dele que sai a URL final.
    const requisicao = entrada instanceof Request ? entrada : new Request(entrada, init);
    chamadas.push({ url: requisicao.url, init: { ...init, method: requisicao.method } });
    return Promise.resolve(resposta);
  });

  return chamadas;
}

function driver() {
  return new R2StorageDriver(
    'connect-gsa-media',
    'https://midia.exemplo.com.br/',
    'conta123',
    'chave',
    'segredo',
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('armazenamento no R2', () => {
  it('grava no endpoint do bucket, com cache longo', async () => {
    const chamadas = comFetchFalso(new Response(null, { status: 200 }));

    await driver().save('posts/2026-08/abc.webp', Buffer.from('imagem'), 'image/webp');

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.url).toBe(
      'https://conta123.r2.cloudflarestorage.com/connect-gsa-media/posts/2026-08/abc.webp',
    );
    expect(chamadas[0]?.init.method).toBe('PUT');
  });

  it('monta a URL pública sem duplicar a barra', () => {
    // A URL configurada termina em barra, e a chave começa sem. Sem o `replace`,
    // sairia `…com.br//posts/…` — que o R2 serve como uma chave DIFERENTE.
    expect(driver().urlFor('posts/2026-08/abc.webp')).toBe(
      'https://midia.exemplo.com.br/posts/2026-08/abc.webp',
    );
  });

  it('trata 404 na exclusão como sucesso @spec:AC-153 @principle:P-012', async () => {
    comFetchFalso(new Response(null, { status: 404 }));

    // Excluir conta apaga várias imagens. Se uma tentativa anterior já tivesse
    // apagado parte delas, lançar aqui deixaria a exclusão pela metade — e o
    // titular ficaria com dados que pediu para remover (P-012).
    await expect(driver().remove('posts/2026-08/sumiu.webp')).resolves.toBeUndefined();
  });

  it('lança com o status, e nunca com o corpo da resposta @spec:AC-154 @principle:P-005', async () => {
    // O corpo de erro do S3 ecoa cabeçalhos da requisição ASSINADA, e esta
    // mensagem vai para o log.
    comFetchFalso(new Response('<Error><StringToSign>AKIA…</StringToSign></Error>', { status: 403 }));

    await expect(driver().remove('posts/2026-08/abc.webp')).rejects.toThrow(/HTTP 403/);
    await expect(driver().remove('posts/2026-08/abc.webp')).rejects.not.toThrow(/StringToSign/);
  });
});
