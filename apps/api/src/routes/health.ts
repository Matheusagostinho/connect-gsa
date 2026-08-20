import { z } from 'zod';
import type { AppInstance } from '../types.js';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
});

/**
 * Sinal de vida da API (AC-018).
 *
 * Deliberadamente raso: não consulta o banco nem reporta dependências. Um
 * health check que expõe estado interno vira reconhecimento gratuito para quem
 * está sondando, e um que consulta o banco derruba o serviço no Render
 * quando o banco tem um soluço.
 */
export function registerHealthRoutes(app: AppInstance, version: string): void {
  app.get(
    '/health',
    {
      schema: { response: { 200: healthResponseSchema } },
      config: { rateLimit: false },
    },
    () => ({ status: 'ok' as const, version }),
  );
}
