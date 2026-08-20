import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageDriver } from './storage.js';

/**
 * Armazenamento em disco, para desenvolvimento e testes.
 *
 * Serve os arquivos pela própria API, em `/media/*`. Não é adequado a produção —
 * o contêiner tem sistema de arquivos efêmero, então um reinício apagaria tudo.
 * Em produção quem responde é o `R2StorageDriver`.
 */
export class LocalStorageDriver implements StorageDriver {
  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  private resolve(key: string): string {
    const target = path.resolve(this.rootDir, key);
    // Cinto e suspensório: as chaves são geradas por nós, mas um caminho que
    // escape da raiz nunca deve ser gravável, aconteça o que acontecer.
    if (!target.startsWith(path.resolve(this.rootDir) + path.sep)) {
      throw new Error(`chave de armazenamento inválida: ${key}`);
    }
    return target;
  }

  async save(key: string, data: Buffer, _contentType: string): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  urlFor(key: string): string {
    return `${this.publicBaseUrl}/media/${key}`;
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
