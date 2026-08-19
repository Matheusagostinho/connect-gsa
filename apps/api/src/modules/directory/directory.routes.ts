import type { PrismaClient } from '@connect-gsa/db';
import {
  ambassadorCardSchema,
  directoryPageSchema,
  directoryQuerySchema,
  institutionSchema,
  mapCitySchema,
  proposeInstitutionSchema,
  skillSchema,
} from '@connect-gsa/shared';
import { z } from 'zod';
import { requireAuth } from '../../auth/session.js';
import type { AppInstance } from '../../types.js';
import { sanitizeText } from '../profile/sanitize.js';
import { buildMap, peopleInCity, searchDirectory } from './directory.service.js';

export function registerDirectoryRoutes(app: AppInstance, prisma: PrismaClient): void {
  app.get(
    '/directory',
    {
      schema: { querystring: directoryQuerySchema, response: { 200: directoryPageSchema } },
      config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
    },
    async (request) => searchDirectory(prisma, requireAuth(request).id, request.query),
  );

  app.get(
    '/map',
    {
      schema: { response: { 200: z.array(mapCitySchema) } },
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request) => {
      requireAuth(request);
      return buildMap(prisma);
    },
  );

  app.get(
    '/map/cities/:cityId',
    {
      schema: {
        params: z.object({ cityId: z.uuid() }),
        response: { 200: z.array(ambassadorCardSchema) },
      },
    },
    async (request) => peopleInCity(prisma, requireAuth(request).id, request.params.cityId),
  );

  /** Catálogo de habilidades. Pequeno e estável — vai inteiro, e o cliente filtra. */
  app.get(
    '/skills',
    { schema: { response: { 200: z.array(skillSchema) } }, config: { rateLimit: false } },
    async (request) => {
      requireAuth(request);
      return prisma.skill.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: { slug: true, name: true, category: true },
      });
    },
  );

  /**
   * Propor uma instituição que não está na lista (AC-042).
   *
   * Nenhuma lista de instituições do Brasil fica completa — perseguir o dataset
   * perfeito é trabalho sem fim. Deixar propor é o conserto durável: a pessoa
   * usa a instituição na hora e a coordenação aprova depois, sem ninguém ficar
   * travado esperando.
   */
  app.post(
    '/institutions/proposals',
    {
      schema: { body: proposeInstitutionSchema, response: { 201: institutionSchema } },
      config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const user = requireAuth(request);

      const name = sanitizeText(request.body.name);
      const campus = sanitizeText(request.body.campus);
      const acronym = request.body.acronym ? sanitizeText(request.body.acronym) : null;

      // Se já existir — inclusive uma proposta de outra pessoa —, reaproveita em
      // vez de criar uma segunda: duplicata é exatamente o que o catálogo evita.
      const existente = await prisma.institution.findUnique({
        where: { name_campus: { name, campus } },
        select: { id: true, name: true, campus: true, acronym: true, status: true },
      });

      // Proposta órfã — de alguém que saiu da rede — volta a ter dono ao ser
      // reproposta. Sem isso ela ficaria invisível para todo mundo e ainda
      // assim bloqueando a criação de uma nova com o mesmo nome.
      const registro = existente
        ? existente.status === 'pending'
          ? await prisma.institution.update({
              where: { id: existente.id },
              data: { proposedById: user.id },
              select: { id: true, name: true, campus: true, acronym: true, status: true },
            })
          : existente
        : await prisma.institution.create({
            data: { name, campus, acronym, status: 'pending', proposedById: user.id },
            select: { id: true, name: true, campus: true, acronym: true, status: true },
          });

      return reply.status(201).send({
        id: registro.id,
        name: registro.name,
        campus: registro.campus,
        acronym: registro.acronym,
        pending: registro.status === 'pending',
      });
    },
  );
}
