import type { PrismaClient } from '@connect-gsa/db';
import { institutionSchema } from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../auth/session.js';
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

  /**
   * Busca de instituições, no nível do CAMPUS.
   *
   * Casa contra nome, sigla e campus, porque é assim que a pessoa procura: quem
   * estuda no IFNMG em Pirapora digita "IFNMG" ou "Pirapora", não o nome por
   * extenso da autarquia (AC-041).
   *
   * Proposta pendente só aparece para quem propôs (AC-043) — assim a pessoa
   * continua achando a sua enquanto a coordenação não aprova, sem sujar a busca
   * de todo mundo com entradas não verificadas.
   */
  app.get(
    '/institutions',
    {
      schema: { querystring: querySchema, response: { 200: z.array(institutionSchema) } },
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request) => {
      const user = requireAuth(request);
      const termo = request.query.q;

      const linhas = await prisma.institution.findMany({
        where: {
          AND: [
            { OR: [{ status: 'approved' }, { status: 'pending', proposedById: user.id }] },
            {
              OR: [
                { name: { contains: termo, mode: 'insensitive' } },
                { acronym: { startsWith: termo, mode: 'insensitive' } },
                { campus: { contains: termo, mode: 'insensitive' } },
              ],
            },
          ],
        },
        select: { id: true, name: true, campus: true, acronym: true, status: true },
        orderBy: [{ name: 'asc' }, { campus: 'asc' }],
        take: 30,
      });

      return linhas.map((i) => ({
        id: i.id,
        name: i.name,
        campus: i.campus,
        acronym: i.acronym,
        pending: i.status === 'pending',
      }));
    },
  );
}
