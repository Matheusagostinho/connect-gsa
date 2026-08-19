import { z } from 'zod';
import { ambassadorCardSchema } from './directory.schema.js';

/**
 * Estado do laço entre duas pessoas, do ponto de vista de quem consulta.
 *
 * `pendingSent` e `pendingReceived` são o MESMO registro no banco visto dos
 * dois lados — a distinção existe porque as ações disponíveis são diferentes:
 * quem enviou pode cancelar, quem recebeu pode aceitar ou recusar.
 */
export const connectionStateSchema = z.enum([
  'none',
  'pendingSent',
  'pendingReceived',
  'connected',
  'self',
]);

export type ConnectionState = z.infer<typeof connectionStateSchema>;

export const connectionListSchema = z.object({
  connected: z.array(ambassadorCardSchema),
  received: z.array(ambassadorCardSchema),
  sent: z.array(ambassadorCardSchema),
});

export type ConnectionList = z.infer<typeof connectionListSchema>;
