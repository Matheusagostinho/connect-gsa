import { POST_LIMITS } from '@connect-gsa/shared';
import { processImage } from './image.js';
import { buildStorageKey, type StorageDriver } from './storage.js';

/**
 * Traz a foto que o provedor social devolve para DENTRO do nosso armazenamento.
 *
 * ## Por que a URL do provedor não pode ser guardada
 *
 * O Better Auth grava `image: user.picture`, e o que o Google devolve é algo
 * como `https://lh3.googleusercontent.com/a/ACg8ocK…`. Esse caminho carrega um
 * identificador derivado da conta Google da pessoa — e o `imageUrl` é servido a
 * qualquer participante que veja o perfil, o diretório, o feed ou um pino do
 * mapa. São dois vazamentos num campo só:
 *
 * 1. **Um identificador de conta de terceiro circula pela rede.** Ele não é o
 *    e-mail, mas é estável e liga a pessoa à conta dela fora daqui — exatamente
 *    o tipo de dado que o P-002 mantém dentro da API.
 * 2. **Cada avatar renderizado é uma requisição ao Google**, que passa a ver o
 *    IP de quem navega e o endereço de onde. É a mesma razão que tirou o Google
 *    Fonts do caminho e escolheu o OpenFreeMap para o mapa.
 *
 * ## O que fazemos no lugar
 *
 * Baixamos uma vez, na criação da conta, e passamos pelo MESMO pipeline de todo
 * upload: decodificar os pixels e escrever um arquivo novo, que nasce sem
 * metadado nenhum (P-001 — foto de rede social carrega EXIF com frequência).
 * Nada de copiar bytes: o arquivo do provedor é entrada não confiável como
 * qualquer outra.
 *
 * ## Falhar aqui não pode derrubar o cadastro
 *
 * Se o download falhar, a pessoa entra sem foto e o avatar recua para a inicial
 * — comportamento que já existe para quem nunca enviou uma. Recusar o cadastro
 * porque o Google demorou seria trocar um contratempo por um portão fechado.
 */

/** Além disso, o arquivo é grande demais para ser uma foto de perfil. */
const LIMITE_BYTES = POST_LIMITS.imageBytesMax;

/** O provedor não pode nos fazer esperar indefinidamente na criação da conta. */
const TEMPO_LIMITE_MS = 5_000;

export async function importarFotoDoProvedor(
  storage: StorageDriver,
  urlDoProvedor: string,
): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(urlDoProvedor);
  } catch {
    return null;
  }

  // Só https, e nada de endereço interno: este valor vem de um terceiro, e uma
  // requisição que o SERVIDOR dispara a partir de entrada externa é o começo de
  // um SSRF. O provedor sempre devolve https público — recusar o resto não
  // custa nada e fecha a porta.
  if (url.protocol !== 'https:') return null;

  try {
    const resposta = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });

    if (!resposta.ok) return null;

    const tipo = resposta.headers.get('content-type') ?? '';
    if (!tipo.startsWith('image/')) return null;

    const bytes = Buffer.from(await resposta.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > LIMITE_BYTES) return null;

    // O mesmo tratamento do upload feito pela pessoa: o tipo vem dos BYTES,
    // nunca do `Content-Type`, que é do outro lado e não vale nada.
    const processada = await processImage(bytes, {
      maxSide: POST_LIMITS.avatarSide,
      square: true,
    });

    const chave = buildStorageKey('avatars', processada.extension);
    await storage.save(chave, processada.data, processada.contentType);

    return storage.urlFor(chave);
  } catch {
    // Rede fora, tempo esgotado, arquivo que não é imagem de verdade: nenhum
    // desses é motivo para impedir alguém de entrar na rede.
    return null;
  }
}
