import { Storage } from '@google-cloud/storage';
import type { StorageDriver } from './storage.js';

/**
 * Armazenamento no Cloud Storage — o driver de produção.
 *
 * A autenticação vem das credenciais padrão do ambiente: no Cloud Run, a conta
 * de serviço do próprio serviço. Não há chave de conta de serviço no
 * repositório nem em variável de ambiente (P-007).
 *
 * O bucket serve leitura pública porque as imagens de post e de perfil são
 * visíveis a qualquer participante autenticado, e uma URL assinada por imagem
 * inviabilizaria o cache do CDN sem ganho real de privacidade — a chave já é um
 * UUID imprevisível.
 */
export class CloudStorageDriver implements StorageDriver {
  private readonly storage = new Storage();

  constructor(
    private readonly bucketName: string,
    private readonly publicBaseUrl: string,
  ) {}

  async save(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.storage
      .bucket(this.bucketName)
      .file(key)
      .save(data, {
        contentType,
        // Chave imutável (UUID por arquivo), então o cache pode ser longo: a
        // imagem nunca muda de conteúdo sob a mesma chave.
        metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      });
  }

  urlFor(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  async remove(key: string): Promise<void> {
    await this.storage.bucket(this.bucketName).file(key).delete({ ignoreNotFound: true });
  }
}
