import type { ConnectionList } from '@connect-gsa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';
import { canonicalPair } from './connection.service.js';

const prisma = testDb();
let app: FastifyInstance;

/** Cria alguém já com perfil concluído — só assim entra em diretório e conexões. */
async function embaixador(nome: string) {
  const [city, institution] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'IFNMG', campus: 'Pirapora' } }),
  ]);
  const user = await createTestUser();
  return prisma.user.update({
    where: { id: user.id },
    data: {
      name: nome,
      slug: nome.toLowerCase().replace(/ /g, '-'),
      course: 'Ciência da Computação',
      profileComplete: true,
      visibleOnMap: true,
      cityId: city.id,
      institutionId: institution.id,
    },
  });
}

const pedir = (de: string, para: string) =>
  app.inject({ method: 'POST', url: `/api/connections/${para}`, headers: asUser(de) });
const aceitar = (de: string, para: string) =>
  app.inject({ method: 'POST', url: `/api/connections/${para}/accept`, headers: asUser(de) });
const remover = (de: string, para: string) =>
  app.inject({ method: 'DELETE', url: `/api/connections/${para}`, headers: asUser(de) });
const listar = async (de: string) =>
  (await app.inject({ method: 'GET', url: '/api/connections', headers: asUser(de) }))
    .json<ConnectionList>();

beforeAll(async () => {
  app = await buildTestApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestData();
});

describe('conexões', () => {
  it('conecta depois do aceite @spec:AC-055', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    expect((await pedir(ana.id, bruno.id)).json()).toEqual({ connection: 'pendingSent' });
    expect((await aceitar(bruno.id, ana.id)).json()).toEqual({ connection: 'connected' });

    const daAna = await listar(ana.id);
    const doBruno = await listar(bruno.id);

    expect(daAna.connected.map((p) => p.id)).toEqual([bruno.id]);
    expect(doBruno.connected.map((p) => p.id)).toEqual([ana.id]);
  });

  it('pedido pendente não é conexão @spec:AC-056', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    await pedir(ana.id, bruno.id);

    const daAna = await listar(ana.id);
    const doBruno = await listar(bruno.id);

    expect(daAna.connected).toEqual([]);
    expect(daAna.sent.map((p) => p.id)).toEqual([bruno.id]);
    expect(doBruno.connected).toEqual([]);
    expect(doBruno.received.map((p) => p.id)).toEqual([ana.id]);
  });

  it('nunca cria dois laços para o mesmo par @spec:AC-057', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    // Pedido repetido, e pedido cruzado ao mesmo tempo.
    await Promise.all([pedir(ana.id, bruno.id), pedir(ana.id, bruno.id), pedir(bruno.id, ana.id)]);

    await expect(prisma.connection.count()).resolves.toBe(1);
  });

  it('pedir de volta a quem já pediu equivale a aceitar', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    await pedir(ana.id, bruno.id);
    const resposta = await pedir(bruno.id, ana.id);

    expect(resposta.json()).toEqual({ connection: 'connected' });
  });

  it('recusa pedido e desfaz conexão @spec:AC-058', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    await pedir(ana.id, bruno.id);
    expect((await remover(bruno.id, ana.id)).json()).toEqual({ connection: 'none' });
    await expect(prisma.connection.count()).resolves.toBe(0);

    await pedir(ana.id, bruno.id);
    await aceitar(bruno.id, ana.id);
    await remover(ana.id, bruno.id);

    expect((await listar(ana.id)).connected).toEqual([]);
    expect((await listar(bruno.id)).connected).toEqual([]);
  });

  it('não deixa aceitar o próprio pedido', async () => {
    const [ana, bruno] = await Promise.all([embaixador('Ana'), embaixador('Bruno')]);

    await pedir(ana.id, bruno.id);
    const resposta = await aceitar(ana.id, bruno.id);

    expect(resposta.statusCode).toBe(404);
    const registro = await prisma.connection.findFirstOrThrow();
    expect(registro.status).toBe('pending');
  });

  it('não deixa alguém se conectar consigo mesmo', async () => {
    const ana = await embaixador('Ana');

    expect((await pedir(ana.id, ana.id)).statusCode).toBe(400);
  });

  it('ordena o par sempre do mesmo jeito, venha de onde vier', () => {
    expect(canonicalPair('bbb', 'aaa')).toEqual({ userAId: 'aaa', userBId: 'bbb' });
    expect(canonicalPair('aaa', 'bbb')).toEqual({ userAId: 'aaa', userBId: 'bbb' });
  });

  it('exige sessão', async () => {
    const ana = await embaixador('Ana');
    const resposta = await app.inject({ method: 'GET', url: '/api/connections' });
    expect(resposta.statusCode).toBe(401);
    expect(resposta.body).not.toContain(ana.email);
  });
});
