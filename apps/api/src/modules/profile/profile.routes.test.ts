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
    skillSlugs: ['react', 'go'],
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

    for (const url of ['/api/me', `/api/profiles/${ana.id}`]) {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(401);
      expect(response.body).not.toContain(ana.email);
      expect(response.json()).toMatchObject({ code: 'UNAUTHORIZED' });
    }
  });

  it('marca o perfil como incompleto até o onboarding terminar @spec:AC-009', async () => {
    const ana = await createTestUser();
    const { city, institution } = await reference();

    const antes = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(ana.id) });
    expect(antes.statusCode).toBe(200);
    expect(antes.json()).toMatchObject({ profileComplete: false, institution: null, city: null });

    const depois = await app.inject({
      method: 'PATCH',
      url: '/api/me',
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
      url: '/api/me',
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
      url: '/api/me',
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
      url: '/api/me',
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
      url: '/api/me',
      headers: asUser(ana.id),
      payload: validProfile(city.id, institution.id),
    });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: asUser(ana.id),
      payload: {
        ...validProfile(city.id, institution.id),
        bio: 'Nova bio',
        skillSlugs: ['kotlin'],
      },
    });

    const atualizado = response.json<{ bio: string; skills: { slug: string }[] }>();
    expect(atualizado.bio).toBe('Nova bio');
    expect(atualizado.skills.map((s) => s.slug)).toEqual(['kotlin']);
  });

  it('recusa edição de perfil alheio no servidor @spec:AC-013', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const { city, institution } = await reference();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/profiles/${bruno.id}`,
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
      url: '/api/me',
      headers: asUser(bruno.id),
      payload: validProfile(city.id, institution.id),
    });

    const alheio = await app.inject({
      method: 'GET',
      url: `/api/profiles/${bruno.id}`,
      headers: asUser(ana.id),
    });

    expect(alheio.statusCode).toBe(200);
    expect(alheio.body).not.toContain('bruno.contato@uni.br');
    expect(alheio.json()).not.toHaveProperty('email');

    // Nem no próprio perfil o e-mail trafega: o SPA nunca precisou dele.
    const proprio = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(bruno.id) });
    expect(proprio.body).not.toContain('bruno.contato@uni.br');
    expect(proprio.json()).not.toHaveProperty('email');
  });

  it('deixa o perfil novo fora do mapa @spec:AC-015 @principle:P-001', async () => {
    const ana = await createTestUser();
    const { city, institution } = await reference();

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/me',
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
      url: '/api/me/privacy',
      headers: asUser(ana.id),
      payload: { visibleOnMap: true },
    });
    expect(ligou.json()).toMatchObject({ visibleOnMap: true });

    const desligou = await app.inject({
      method: 'PATCH',
      url: '/api/me/privacy',
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
      url: `/api/profiles/${bruno.id}`,
      headers: asUser(ana.id),
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('contagens do perfil', () => {
  /**
   * Perfil completo — sem isso a pessoa não aparece para terceiros nem aceita
   * conexão.
   *
   * Recebe o nome porque o slug é derivado dele: três pessoas chamadas
   * "Ana Souza" criadas ao mesmo tempo disputam o mesmo slug, e a que perde a
   * corrida fica com o perfil incompleto — que some do `/profiles/:id` e o teste
   * falha com um 404 que não tem nada a ver com o que ele mede.
   */
  async function comPerfil(name: string) {
    const user = await createTestUser();
    const { city, institution } = await reference();
    await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: asUser(user.id),
      payload: { ...validProfile(city.id, institution.id), name },
    });
    return user;
  }

  it('conta apenas conexões aceitas, nunca pedidos pendentes @spec:AC-109', async () => {
    const ana = await comPerfil('Ana Souza');
    const bruno = await comPerfil('Bruno Lima');
    const carla = await comPerfil('Carla Nogueira');

    // Bruno pede e Ana aceita; Carla pede e ninguém responde.
    await app.inject({
      method: 'POST',
      url: `/api/connections/${ana.id}`,
      headers: asUser(bruno.id),
    });
    await app.inject({
      method: 'POST',
      url: `/api/connections/${bruno.id}/accept`,
      headers: asUser(ana.id),
    });
    await app.inject({
      method: 'POST',
      url: `/api/connections/${ana.id}`,
      headers: asUser(carla.id),
    });

    const resposta = await app.inject({
      method: 'GET',
      url: `/api/profiles/${ana.id}`,
      headers: asUser(bruno.id),
    });

    // Duas pessoas se relacionam com Ana, mas só uma tem conexão com ela.
    expect(resposta.json<{ connectionCount: number }>().connectionCount).toBe(1);
  });

  it('conta publicações do feed, e não comunicado oficial @spec:AC-109', async () => {
    const ana = await createTestUser({ role: 'admin' });
    const { city, institution } = await reference();
    await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: asUser(ana.id),
      payload: validProfile(city.id, institution.id),
    });

    await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(ana.id),
      payload: { content: 'Publicação minha' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/announcements',
      headers: asUser(ana.id),
      payload: { content: 'Comunicado da coordenação' },
    });

    const resposta = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(ana.id) });

    // O comunicado pertence à coordenação, não à pessoa: contá-lo inflaria o
    // perfil de quem por acaso tem o papel.
    expect(resposta.json<{ postCount: number }>().postCount).toBe(1);
  });

  it('devolve zero para quem ainda não fez nada, e não campo ausente @spec:AC-109', async () => {
    const ana = await comPerfil('Ana Souza');

    const resposta = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(ana.id) });
    const perfil = resposta.json<{ connectionCount: number; postCount: number }>();

    expect(perfil.connectionCount).toBe(0);
    expect(perfil.postCount).toBe(0);
  });
});

describe('trocar o nome de usuário', () => {
  async function comPerfil(name: string, extra: Record<string, unknown> = {}) {
    const user = await createTestUser();
    const { city, institution } = await reference();
    await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: asUser(user.id),
      payload: { ...validProfile(city.id, institution.id), name, ...extra },
    });
    return user;
  }

  async function trocar(userId: string, slug: string) {
    const { city, institution } = await reference();
    return app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: asUser(userId),
      payload: { ...validProfile(city.id, institution.id), name: 'Ana Souza', slug },
    });
  }

  it('o endereço antigo continua encontrando o perfil @spec:AC-118', async () => {
    const ana = await comPerfil('Ana Souza');
    const bruno = await comPerfil('Bruno Lima');

    const antes = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(ana.id) });
    const slugAntigo = antes.json<{ slug: string }>().slug;

    const troca = await trocar(ana.id, 'ana-dev');
    expect(troca.statusCode).toBe(200);
    expect(troca.json<{ slug: string }>().slug).toBe('ana-dev');

    // O link que já circulou em conversa não pode virar 404 de um dia para o
    // outro — é a razão pela qual o slug era imutável antes.
    const peloAntigo = await app.inject({
      method: 'GET',
      url: `/api/profiles/${slugAntigo}`,
      headers: asUser(bruno.id),
    });

    expect(peloAntigo.statusCode).toBe(200);
    expect(peloAntigo.json<{ slug: string }>().slug).toBe('ana-dev');
  });

  it('recusa nome de usuário que já é de outra pessoa @spec:AC-117', async () => {
    const ana = await comPerfil('Ana Souza');
    const bruno = await comPerfil('Bruno Lima');

    const dele = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(bruno.id) });
    const resposta = await trocar(ana.id, dele.json<{ slug: string }>().slug);

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json<{ message: string }>().message).toMatch(/já está em uso/i);
  });

  it('recusa tomar o endereço anterior de outra pessoa @spec:AC-118', async () => {
    const ana = await comPerfil('Ana Souza');
    const bruno = await comPerfil('Bruno Lima');

    const antes = await app.inject({ method: 'GET', url: '/api/me', headers: asUser(ana.id) });
    const slugAntigo = antes.json<{ slug: string }>().slug;

    await trocar(ana.id, 'ana-dev');

    // Enquanto o endereço antigo de Ana ainda responde, ninguém pode tomá-lo:
    // o link antigo passaria a levar ao perfil ERRADO, que é pior que não levar
    // a lugar nenhum.
    const resposta = await trocar(bruno.id, slugAntigo);

    expect(resposta.statusCode).toBe(400);
  });

  it('recusa segunda troca antes do intervalo mínimo @spec:AC-119', async () => {
    const ana = await comPerfil('Ana Souza');

    expect((await trocar(ana.id, 'ana-dev')).statusCode).toBe(200);

    const segunda = await trocar(ana.id, 'ana-dev-2');
    expect(segunda.statusCode).toBe(400);
    expect(segunda.json<{ message: string }>().message).toMatch(/30 dias/);
  });

  it('salvar o perfil sem mexer no nome de usuário não conta como troca @spec:AC-119', async () => {
    const ana = await comPerfil('Ana Souza');
    const { city, institution } = await reference();

    // Sem esta regra, editar a bio duas vezes esgotaria o intervalo de troca.
    for (let i = 0; i < 3; i += 1) {
      const resposta = await app.inject({
        method: 'PATCH',
        url: '/api/me',
        headers: asUser(ana.id),
        payload: { ...validProfile(city.id, institution.id), bio: `versão ${i}` },
      });
      expect(resposta.statusCode).toBe(200);
    }
  });
});
