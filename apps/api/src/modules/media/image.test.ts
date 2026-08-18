import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processImage } from './image.js';

/**
 * O reprocessamento de imagem é uma barreira de privacidade, não um ajuste de
 * qualidade. Estes testes cobrem o que aconteceria se ela caísse: a foto de um
 * embaixador entregando onde ele estava quando a tirou.
 */

/** Monta um JPEG com EXIF contendo coordenadas de GPS, como sai de um celular. */
async function fotoComGps(): Promise<Buffer> {
  return sharp({ create: { width: 600, height: 400, channels: 3, background: '#4285f4' } })
    // O bloco GPS não está no tipo público do sharp, mas é gravado do mesmo
    // jeito — e é exatamente o que uma foto de celular carrega.
    .withExif({
      IFD0: { Model: 'Pixel 9 Pro', Make: 'Google' },
      GPS: {
        GPSLatitudeRef: 'S',
        GPSLatitude: '8/1 3/1 2820/100',
        GPSLongitudeRef: 'W',
        GPSLongitude: '34/1 52/1 3756/100',
      },
    } as Parameters<ReturnType<typeof sharp>['withExif']>[0])
    .jpeg()
    .toBuffer();
}

describe('reprocessamento de imagem', () => {
  it('descarta as coordenadas de GPS embutidas na foto @spec:AC-026 @principle:P-001', async () => {
    const original = await fotoComGps();

    // Confere primeiro que o caso de teste é real: a entrada TEM o GPS.
    const antes = await sharp(original).metadata();
    expect(antes.exif).toBeDefined();

    const { data } = await processImage(original, { maxSide: 1200 });

    const depois = await sharp(data).metadata();
    expect(depois.exif).toBeUndefined();

    // E nem sobra rastro nos bytes: nada de "Pixel" nem marcador de GPS.
    const bytes = data.toString('latin1');
    expect(bytes).not.toContain('GPS');
    expect(bytes).not.toContain('Pixel');
  });

  it('recusa arquivo que não é imagem, mesmo com cara de jpg @spec:AC-027', async () => {
    // Cabeçalho de executável ELF — o que um upload malicioso tentaria passar.
    const executavel = Buffer.concat([
      Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]),
      Buffer.alloc(2048, 0x41),
    ]);

    await expect(processImage(executavel, { maxSide: 1200 })).rejects.toThrow(/não é uma imagem/i);
  });

  it('recusa arquivo acima do limite antes de processar @spec:AC-028', async () => {
    const gigante = Buffer.alloc(5 * 1024 * 1024 + 1);

    await expect(processImage(gigante, { maxSide: 1200 })).rejects.toThrow(/grande demais/i);
  });

  it('recusa arquivo vazio', async () => {
    await expect(processImage(Buffer.alloc(0), { maxSide: 1200 })).rejects.toThrow(/vazio/i);
  });

  it('reduz o maior lado ao limite, preservando a proporção', async () => {
    const larga = await sharp({
      create: { width: 4000, height: 2000, channels: 3, background: '#fff' },
    })
      .jpeg()
      .toBuffer();

    const { width, height, contentType } = await processImage(larga, { maxSide: 1200 });

    expect(width).toBe(1200);
    expect(height).toBe(600);
    expect(contentType).toBe('image/webp');
  });

  it('não amplia imagem pequena — esticar piora e engorda o arquivo', async () => {
    const pequena = await sharp({
      create: { width: 100, height: 80, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();

    const { width, height } = await processImage(pequena, { maxSide: 1200 });

    expect(width).toBe(100);
    expect(height).toBe(80);
  });

  it('recorta a foto de perfil em quadrado @spec:AC-029', async () => {
    const retangular = await sharp({
      create: { width: 900, height: 500, channels: 3, background: '#fff' },
    })
      .jpeg()
      .toBuffer();

    const { width, height } = await processImage(retangular, { maxSide: 320, square: true });

    expect(width).toBe(320);
    expect(height).toBe(320);
  });
});
