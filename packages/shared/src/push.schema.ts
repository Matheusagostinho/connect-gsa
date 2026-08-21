import { z } from 'zod';

/**
 * A inscrição que o navegador devolve ao autorizar as notificações.
 *
 * O formato é ditado pela API de Push do navegador, não por nós — daí os nomes
 * `p256dh` e `auth`, que são os das chaves de criptografia do padrão.
 *
 * `endpoint` é uma URL do serviço de push do fabricante (Google, Mozilla,
 * Apple). Ela identifica o APARELHO, não a pessoa, e é o que o navegador garante
 * ser único por origem.
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({
    /** Chave pública do aparelho. Base64 de 65 bytes, em texto seguro para URL. */
    p256dh: z.string().trim().min(1).max(200),
    /** Segredo de autenticação. Base64 de 16 bytes. */
    auth: z.string().trim().min(1).max(100),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

/**
 * O que o servidor manda para o aparelho.
 *
 * Já PRONTO para exibição: o service worker roda sem sessão e sem contexto, e
 * pedir dado de lá seria pedir de um lugar que não tem permissão para recebê-lo.
 *
 * Repare no que NÃO cabe aqui: e-mail, identificador de terceiro e conteúdo
 * integral de publicação (P-002). Um aviso aparece na tela bloqueada, à vista de
 * quem estiver por perto — é a superfície MENOS privada do produto.
 */
export const pushPayloadSchema = z.object({
  titulo: z.string().max(80),
  corpo: z.string().max(160),
  url: z.string().max(200),
  /** Avisos com a mesma `tag` se substituem em vez de empilhar. */
  tag: z.string().max(80),
});

export type PushPayload = z.infer<typeof pushPayloadSchema>;

/** O que a tela precisa saber para oferecer (ou não) o botão de autorizar. */
export const pushStatusSchema = z.object({
  /** Nulo quando o servidor não tem chaves configuradas — o recurso fica off. */
  publicKey: z.string().nullable(),
  inscrito: z.boolean(),
});

export type PushStatus = z.infer<typeof pushStatusSchema>;
