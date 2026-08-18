import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

/** Cidade e instituição vêm do seed; os testes não as criam nem as apagam. */
async function reference() {
  const [city, institution] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'UFPE' } }),
  ]);
  return { city, institution };
}

function validProfile(cityId: string, institutionId: string) {
  return {
    name: 'Ana Souza',
    institutionId,
    cityId,
    course: 'Ciência da Computação',
    bio: 'Embaixadora e entusiasta de IA.',
    skills: ['React', 'Go'],
    links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/ana' }],
  };
}

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

describe('rotas de perfil', () => {
  it('responde que está viva sem exigir login @spec:AC-018', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', version: '0.1.0' });
  });

  it('recusa área restrita sem sessão, sem devolver dado nenhum @spec:AC-019', async () => {
    const ana = await createTestUser();

    for (const url of ['/me', `/profiles/${ana.id}`]) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(401);
      expect(response.body).not.toContain(ana.email);
      expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    }
  });

  it('marca o perfil como incompleto até o onboarding terminar @spec:AC-009', async () => {
    const ana = await createTestUser();
    const { city, institution } = await reference();

    const antes = await app.inject({ method: 'GET', url: '/me', headers: asUser(ana.id) });
    expect(antes.statusCode).toBe(200);
    expect(antes.json()).toMatchObject({ profileComplete: false, institution: null, city: null });

    const depois = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(ana.id),
      payload: validProfile(city.id, institution.id),
    });

    expect(depois.statusCode).toBe(200);
    expect(depois.json()).toMatchObject({ profileComplete: true });
  });

  it('desarma HTML colado na bio antes de gravar @spec:AC-010', async () => {
    const ana = await createTestUser();
    const { city, institution } = await reference();

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(ana.id),
      payload: {
        ...validProfile(city.id, institution.id),
        bio: '<img src=x onerror=alert(1)>Olá',
      },
    });

    expect(response.json()).toMatchObject({ bio: 'Olá' });

    // E o banco também está limpo — não só a resposta.
    const gravado = await prisma.user.findUniqueOrThrow({ where: { id: ana.id } });
    expect(gravado.bio).toBe('Olá');
  });

  it('guarda a cidade e o centroide dela, nunca coordenada do aparelho @spec:AC-011', async () => {
    const ana = await createTestUser();
    const { city, institution } = await reference();

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(ana.id),
      payload: validProfile(city.id, institution.id),
    });

    expect(response.json()).toMatchObject({
      city: { name: 'Recife', state: 'PE', latitude: city.latitude, longitude: city.longitude },
    });

    // A coordenada devolvida é a do município — não veio do cliente.
    const gravado = await prisma.user.findUniqueOrThrow({ where: { id: ana.id } });
    expect(Object.keys(gravado)).not.toContain('latitude');
    expect(Object.keys(gravado)).not.toContain('longitude');
  });

  it('recusa cidade inexistente, para a posição no mapa nunca vir do cliente', async () => {
    const ana = await createTestUser();
    const { institution } = await reference();

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(ana.id),
      payload: validProfile('11111111-1111-4111-8111-111111111111', institution.id),
    });

    expect(response.statusCode).toBe(404);
  });

  it('salva as alterações do próprio perfil @spec:AC-012', async () => {
    const ana = await createTestUser();
    const { city, institution } = await reference();

    await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(ana.id),
      payload: validProfile(city.id, institution.id),
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(ana.id),
      payload: {
        ...validProfile(city.id, institution.id),
        bio: 'Nova bio',
        skills: ['Kotlin'],
      },
    });

    expect(response.json()).toMatchObject({ bio: 'Nova bio', skills: ['Kotlin'] });
  });

  it('recusa edição de perfil alheio no servidor @spec:AC-013', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const { city, institution } = await reference();

    const response = await app.inject({
      method: 'PATCH',
      url: `/profiles/${bruno.id}`,
      headers: asUser(ana.id),
      payload: { ...validProfile(city.id, institution.id), bio: 'invadido' },
    });

    expect(response.statusCode).toBe(403);

    const intacto = await prisma.user.findUniqueOrThrow({ where: { id: bruno.id } });
    expect(intacto.bio).not.toBe('invadido');
  });

  it('não entrega o e-mail de ninguém junto do perfil @spec:AC-014 @principle:P-002', async () => {
    const [ana, bruno] = await Promise.all([
      createTestUser({ email: 'ana.contato@uni.br' }),
      createTestUser({ email: 'bruno.contato@uni.br' }),
    ]);
    const { city, institution } = await reference();

    await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(bruno.id),
      payload: validProfile(city.id, institution.id),
    });

    const alheio = await app.inject({
      method: 'GET',
      url: `/profiles/${bruno.id}`,
      headers: asUser(ana.id),
    });

    expect(alheio.statusCode).toBe(200);
    expect(alheio.body).not.toContain('bruno.contato@uni.br');
    expect(alheio.json()).not.toHaveProperty('email');

    // Nem no próprio perfil o e-mail trafega: o SPA nunca precisou dele.
    const proprio = await app.inject({ method: 'GET', url: '/me', headers: asUser(bruno.id) });
    expect(proprio.body).not.toContain('bruno.contato@uni.br');
    expect(proprio.json()).not.toHaveProperty('email');
  });

  it('deixa o perfil novo fora do mapa @spec:AC-015 @principle:P-001', async () => {
    const ana = await createTestUser();
    const { city, institution } = await reference();

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: asUser(ana.id),
      payload: validProfile(city.id, institution.id),
    });

    // Concluir o onboarding NÃO coloca ninguém no mapa.
    expect(response.json()).toMatchObject({ visibleOnMap: false });
  });

  it('liga e desliga a presença no mapa na hora @spec:AC-016', async () => {
    const ana = await createTestUser();

    const ligou = await app.inject({
      method: 'PATCH',
      url: '/me/privacy',
      headers: asUser(ana.id),
      payload: { visibleOnMap: true },
    });
    expect(ligou.json()).toMatchObject({ visibleOnMap: true });

    const desligou = await app.inject({
      method: 'PATCH',
      url: '/me/privacy',
      headers: asUser(ana.id),
      payload: { visibleOnMap: false },
    });
    expect(desligou.json()).toMatchObject({ visibleOnMap: false });

    const conferido = await prisma.user.findUniqueOrThrow({ where: { id: ana.id } });
    expect(conferido.visibleOnMap).toBe(false);
  });

  it('esconde perfil incompleto de terceiros', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);

    const response = await app.inject({
      method: 'GET',
      url: `/profiles/${bruno.id}`,
      headers: asUser(ana.id),
    });

    expect(response.statusCode).toBe(404);
  });
});
