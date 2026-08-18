import type { PrismaClient } from '@connect-gsa/db';
import { z } from 'zod';
import type { AppInstance } from '../types.js';

/**
 * Dados de referência para o onboarding: cidades e instituições.
 *
 * São 5.571 municípios — a lista nunca é devolvida inteira. A busca exige um
 * termo e devolve no máximo 20 resultados, o que serve ao autocompletar e, de
 * quebra, não transforma a rota em uma fonte de carga barata.
 */
export function registerReferenceRoutes(app: AppInstance, prisma: PrismaClient): void {
  const querySchema = z.object({ q: z.string().trim().min(2).max(60) });

  app.get(
    '/cities',
    {
      schema: {
        querystring: querySchema,
        response: {
          200: z.array(
            z.object({
              id: z.uuid(),
              name: z.string(),
              state: z.string(),
              latitude: z.number(),
              longitude: z.number(),
            }),
          ),
        },
      },
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request) =>
      prisma.city.findMany({
        where: { name: { startsWith: request.query.q, mode: 'insensitive' } },
        select: { id: true, name: true, state: true, latitude: true, longitude: true },
        orderBy: [{ name: 'asc' }, { state: 'asc' }],
        take: 20,
      }),
  );

  app.get(
    '/institutions',
    {
      schema: {
        querystring: querySchema,
        response: {
          200: z.array(
            z.object({ id: z.uuid(), name: z.string(), acronym: z.string().nullable() }),
          ),
        },
      },
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request) =>
      prisma.institution.findMany({
        where: {
          OR: [
            { name: { contains: request.query.q, mode: 'insensitive' } },
            { acronym: { startsWith: request.query.q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, acronym: true },
        orderBy: { name: 'asc' },
        take: 20,
      }),
  );
}
