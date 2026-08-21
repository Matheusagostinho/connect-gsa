import { z } from 'zod';
import type { AppInstance } from '../types.js';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  /** Os 7 primeiros caracteres do commit publicado. `desconhecido` fora do deploy. */
  commit: z.string(),
});

/**
 * Sinal de vida da API (AC-018).
 *
 * Deliberadamente raso: não consulta o banco nem reporta dependências. Um
 * health check que expõe estado interno vira reconhecimento gratuito para quem
 * está sondando, e um que consulta o banco derruba o serviço no Render
 * quando o banco tem um soluço.
 *
 * ## Por que o commit está aqui
 *
 * Durante a publicação, a pergunta "o que está no ar já tem a correção?" ficou
 * sem resposta várias vezes seguidas — e a cada vez o caminho era adivinhar pelo
 * sintoma. Sete caracteres de hash resolvem isso em uma requisição.
 *
 * Não é vazamento: o repositório é público, e o hash não diz nada que um `git
 * log` não diga. O que continua fora daqui é estado interno — banco, versões de
 * dependência, variáveis.
 *
 * `RENDER_GIT_COMMIT` é injetada pelo próprio Render. Fora dele a resposta é
 * `desconhecido`, que é honesto: em desenvolvimento não existe commit publicado.
 */
export function registerHealthRoutes(app: AppInstance, version: string): void {
  const commit = (process.env['RENDER_GIT_COMMIT'] ?? '').slice(0, 7) || 'desconhecido';

  app.get(
    '/health',
    {
      schema: { response: { 200: healthResponseSchema } },
      config: { rateLimit: false },
    },
    () => ({ status: 'ok' as const, version, commit }),
  );
}
