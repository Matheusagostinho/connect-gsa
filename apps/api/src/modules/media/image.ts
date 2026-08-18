import sharp, { type Metadata, type Sharp } from 'sharp';
import { POST_LIMITS } from '@connect-gsa/shared';
import { badRequest } from '../../plugins/errors.js';

/**
 * Reprocessamento de imagem enviada.
 *
 * Este arquivo existe por um motivo de privacidade, não de estética: **foto
 * tirada em celular carrega coordenadas de GPS no EXIF**. Guardar o arquivo como
 * ele chegou entregaria a localização exata de um estudante a qualquer pessoa
 * que baixasse a imagem — exatamente o que o P-001 existe para impedir, e por um
 * caminho que o schema do banco não cobre.
 *
 * A defesa é reencodar sempre. Não tentamos "remover os campos ruins" do EXIF:
 * lista de bloqueio envelhece mal. Decodificamos os pixels e escrevemos um
 * arquivo novo, que nasce sem metadado nenhum.
 *
 * O tipo também é decidido pelos BYTES do arquivo, nunca pela extensão nem pelo
 * `Content-Type` — os dois vêm do cliente e não valem nada.
 */

/** Formatos que aceitamos na entrada. Todos saem como WebP. */
const FORMATOS_ACEITOS = new Set(['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif']);

export interface ProcessedImage {
  data: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
}

export interface ProcessOptions {
  /** Maior lado da imagem resultante, em pixels. */
  maxSide: number;
  /** Recorta em quadrado centralizado — usado na foto de perfil. */
  square?: boolean;
}

export async function processImage(
  input: Buffer,
  { maxSide, square = false }: ProcessOptions,
): Promise<ProcessedImage> {
  if (input.byteLength > POST_LIMITS.imageBytesMax) {
    throw badRequest('Imagem grande demais. O limite é 5 MB.', 'IMAGE_TOO_LARGE');
  }

  if (input.byteLength === 0) {
    throw badRequest('Arquivo vazio.', 'IMAGE_INVALID');
  }

  let pipeline: Sharp;
  let metadata: Metadata;

  try {
    // O sharp só decodifica o que é imagem de verdade. Um executável renomeado
    // para .jpg falha aqui, antes de qualquer coisa ser gravada (AC-027).
    pipeline = sharp(input, { failOn: 'error' });
    metadata = await pipeline.metadata();
  } catch {
    throw badRequest('Esse arquivo não é uma imagem válida.', 'IMAGE_INVALID');
  }

  if (!metadata.format || !FORMATOS_ACEITOS.has(metadata.format)) {
    throw badRequest('Formato de imagem não suportado.', 'IMAGE_INVALID');
  }

  const resized = pipeline
    // `rotate()` sem argumento aplica a orientação do EXIF ANTES de descartá-lo:
    // sem isso, foto tirada de lado sairia deitada depois da limpeza.
    .rotate()
    .resize({
      width: square ? maxSide : maxSide,
      height: square ? maxSide : undefined,
      fit: square ? 'cover' : 'inside',
      // Não ampliar: imagem pequena esticada fica pior, e o arquivo cresce à toa.
      withoutEnlargement: true,
    })
    .webp({ quality: 82 });

  const { data, info } = await resized.toBuffer({ resolveWithObject: true });

  return {
    data,
    contentType: 'image/webp',
    extension: 'webp',
    width: info.width,
    height: info.height,
  };
}
