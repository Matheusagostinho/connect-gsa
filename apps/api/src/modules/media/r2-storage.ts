import { AwsClient } from 'aws4fetch';
import type { StorageDriver } from './storage.js';

/**
 * Armazenamento no Cloudflare R2 — o driver de produção.
 *
 * ## Por que um cliente com nome de AWS numa coisa da Cloudflare
 *
 * O R2 não tem SDK próprio para servidor: a Cloudflare fez a API dele
 * **compatível com o protocolo S3** de propósito, e é assim que a documentação
 * deles manda falar com o bucket de fora de um Worker. Nenhum byte vai para a
 * Amazon — `aws4fetch` só assina a requisição no formato SigV4 e entrega ao
 * `fetch` nativo.
 *
 * Ele foi escolhido em vez do `@aws-sdk/client-s3` porque faz exatamente as duas
 * chamadas que precisamos com **um** pacote em vez de vinte e cinco — o que
 * também mantém a imagem do contêiner pequena. O binding nativo do R2
 * (`env.MEDIA.put`) seria melhor ainda e não serve aqui: ele só existe dentro de
 * Cloudflare Workers, e a API roda no Render.
 *
 * ## Uma diferença de segurança em relação ao driver anterior
 *
 * O Cloud Storage autenticava pelas credenciais do próprio ambiente: não havia
 * chave em lugar nenhum. O R2 exige **chave e segredo**, então passou a existir
 * um segredo que antes não existia. Ele vive em variável de ambiente e nunca no
 * repositório (P-007), e `env.ts` exige as três variáveis em produção — uma
 * configuração pela metade derruba a subida, em vez de gravar imagem em lugar
 * nenhum e descobrir semanas depois.
 *
 * Gere o par com permissão de **Object Read & Write num único bucket**, nunca de
 * conta inteira: uma chave vazada não deve alcançar mais que as imagens.
 *
 * ## Leitura pública
 *
 * O bucket serve leitura pública porque as imagens são visíveis a qualquer
 * participante autenticado, e uma URL assinada por imagem inviabilizaria o cache
 * sem ganho real de privacidade — a chave já é um UUID imprevisível, e
 * `buildStorageKey` garante que o nome vindo do cliente nunca entra nela.
 */
export class R2StorageDriver implements StorageDriver {
  private readonly cliente: AwsClient;
  private readonly endpoint: string;

  constructor(
    bucketName: string,
    private readonly publicBaseUrl: string,
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
  ) {
    // `region: 'auto'` porque o R2 não tem regiões no sentido da AWS — mas a
    // assinatura SigV4 exige o campo, e omiti-lo falha com um erro que não
    // menciona região nenhuma.
    this.cliente = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
    this.endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`;
  }

  /**
   * Lança com o status, mas NUNCA com o corpo da resposta.
   *
   * O corpo de erro do S3 ecoa cabeçalhos da requisição assinada, e esta
   * mensagem vai parar no log (P-005). O status já diz o que precisa ser dito
   * para investigar.
   */
  private static assertOk(resposta: Response, acao: string, key: string): void {
    if (resposta.ok) return;
    throw new Error(`R2 recusou ${acao} de ${key}: HTTP ${resposta.status}`);
  }

  async save(key: string, data: Buffer, contentType: string): Promise<void> {
    const resposta = await this.cliente.fetch(`${this.endpoint}/${key}`, {
      method: 'PUT',
      body: new Uint8Array(data),
      headers: {
        'Content-Type': contentType,
        // Chave imutável (UUID por arquivo), então o cache pode ser longo: a
        // imagem nunca muda de conteúdo sob a mesma chave.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    R2StorageDriver.assertOk(resposta, 'a gravação', key);
  }

  urlFor(key: string): string {
    return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
  }

  async remove(key: string): Promise<void> {
    const resposta = await this.cliente.fetch(`${this.endpoint}/${key}`, { method: 'DELETE' });

    // 404 não é erro aqui: o que importa é o objeto não estar mais lá. É o que
    // permite a exclusão de conta ser reexecutável sem quebrar no meio, quando
    // uma tentativa anterior já apagou parte das imagens.
    if (resposta.status === 404) return;

    R2StorageDriver.assertOk(resposta, 'a exclusão', key);
  }
}
