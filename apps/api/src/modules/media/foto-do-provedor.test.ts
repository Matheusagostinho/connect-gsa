import { afterEach, describe, expect, it, vi } from 'vitest';
import { importarFotoDoProvedor } from './foto-do-provedor.js';
import type { StorageDriver } from './storage.js';

/**
 * A foto que o provedor social devolve.
 *
 * O que está em jogo aqui não é a imagem: é o campo `image` deixar de carregar
 * uma URL do Google. Aquele caminho tem um identificador da conta da pessoa, e o
 * campo é servido a qualquer participante que veja o perfil.
 */
function armazenamentoFalso() {
  const gravados: Array<{ key: string; bytes: number; contentType: string }> = [];
  const storage: StorageDriver = {
    save: (key, data, contentType) => {
      gravados.push({ key, bytes: data.byteLength, contentType });
      return Promise.resolve();
    },
    urlFor: (key) => `https://pub-teste.r2.dev/${key}`,
    remove: () => Promise.resolve(),
  };
  return { storage, gravados };
}

/** Um PNG 1×1 de verdade — o pipeline decodifica os pixels, não confia no tipo. */
const PNG_MINIMO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function respostaFalsa(corpo: Buffer, tipo = 'image/png', ok = true) {
  vi.stubGlobal('fetch', () =>
    Promise.resolve({
      ok,
      headers: new Headers({ 'content-type': tipo }),
      arrayBuffer: () => Promise.resolve(corpo.buffer.slice(corpo.byteOffset, corpo.byteOffset + corpo.byteLength)),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('foto vinda do provedor social', () => {
  it('grava no NOSSO armazenamento e devolve a nossa URL', async () => {
    const { storage, gravados } = armazenamentoFalso();
    respostaFalsa(PNG_MINIMO);

    const url = await importarFotoDoProvedor(storage, 'https://lh3.googleusercontent.com/a/ACg8ocK');

    // O ponto do teste: nada de `lh3.googleusercontent.com` sobrevive.
    expect(url).toMatch(/^https:\/\/pub-teste\.r2\.dev\/avatars\//);
    expect(url).not.toContain('googleusercontent');
    expect(gravados).toHaveLength(1);
    expect(gravados[0]?.contentType).toMatch(/^image\//);
  });

  it('recusa endereço que não seja https, para não virar SSRF', async () => {
    const { storage, gravados } = armazenamentoFalso();
    respostaFalsa(PNG_MINIMO);

    // O valor vem de um TERCEIRO, e quem dispara a requisição é o servidor.
    for (const endereco of [
      'http://lh3.googleusercontent.com/a/x',
      'file:///etc/passwd',
      'http://169.254.169.254/latest/meta-data/',
      'nao-e-url',
    ]) {
      await expect(importarFotoDoProvedor(storage, endereco)).resolves.toBeNull();
    }

    expect(gravados).toEqual([]);
  });

  it('recusa o que não é imagem', async () => {
    const { storage } = armazenamentoFalso();
    respostaFalsa(Buffer.from('<html>não sou imagem</html>'), 'text/html');

    await expect(
      importarFotoDoProvedor(storage, 'https://exemplo.test/a.png'),
    ).resolves.toBeNull();
  });

  it('devolve nulo em vez de lançar quando a rede falha', async () => {
    const { storage } = armazenamentoFalso();
    vi.stubGlobal('fetch', () => Promise.reject(new Error('rede fora')));

    // Recusar o cadastro porque o Google demorou seria trocar um contratempo
    // por um portão fechado: a pessoa entra sem foto, e o avatar vira a inicial.
    await expect(
      importarFotoDoProvedor(storage, 'https://lh3.googleusercontent.com/a/x'),
    ).resolves.toBeNull();
  });
});

describe('a chave de imagem que o cliente manda', () => {
  it('só aceita o formato que o servidor produz', async () => {
    const { mediaKeySchema } = await import('@connect-gsa/shared');

    // O cliente escolhe este valor ao publicar. Sem formato, ele apontaria para
    // qualquer objeto do bucket — ou para fora dele.
    expect(mediaKeySchema.safeParse('posts/2026-08/8f14e45f-ceea-467a-9f9e-1b2c3d4e5f60.webp').success).toBe(true);
    expect(mediaKeySchema.safeParse('avatars/2026-08/8f14e45f-ceea-467a-9f9e-1b2c3d4e5f60.jpg').success).toBe(true);

    for (const invalida of [
      '../../etc/passwd',
      'https://evil.test/x.png',
      'posts/../avatars/8f14e45f-ceea-467a-9f9e-1b2c3d4e5f60.webp',
      'outra-pasta/2026-08/8f14e45f-ceea-467a-9f9e-1b2c3d4e5f60.webp',
      'posts/2026-08/nao-e-uuid.webp',
    ]) {
      expect(mediaKeySchema.safeParse(invalida).success, invalida).toBe(false);
    }
  });
});
