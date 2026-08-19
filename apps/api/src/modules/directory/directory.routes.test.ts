import type { AmbassadorCard, DirectoryPage, Institution, MapCity } from '@connect-gsa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

async function referencias() {
  const [recife, sp, ifnmg, ufpe] = await Promise.all([
    prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
    prisma.city.findFirstOrThrow({ where: { name: 'São Paulo', state: 'SP' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'IFNMG', campus: 'Pirapora' } }),
    prisma.institution.findFirstOrThrow({ where: { acronym: 'UFPE' } }),
  ]);
  return { recife, sp, ifnmg, ufpe };
}

async function embaixador(opts: {
  nome: string;
  cityId?: string;
  institutionId?: string;
  skills?: string[];
  visivel?: boolean;
  completo?: boolean;
}) {
  const user = await createTestUser();
  const skills = opts.skills?.length
    ? await prisma.skill.findMany({ where: { slug: { in: opts.skills } }, select: { id: true } })
    : [];

  return prisma.user.update({
    where: { id: user.id },
    data: {
      name: opts.nome,
      slug: opts.nome.toLowerCase().replace(/ /g, '-'),
      course: 'Engenharia',
      profileComplete: opts.completo ?? true,
      visibleOnMap: opts.visivel ?? true,
      cityId: opts.cityId ?? null,
      institutionId: opts.institutionId ?? null,
      skills: { set: skills.map((s) => ({ id: s.id })) },
    },
  });
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

describe('instituições', () => {
  it('encontra o campus certo pela sigla e pelo nome do campus @spec:AC-041', async () => {
    const ana = await createTestUser();

    for (const termo of ['IFNMG', 'Pirapora', 'Norte de Minas']) {
      const resposta = await app.inject({
        method: 'GET',
        url: `/api/institutions?q=${encodeURIComponent(termo)}`,
        headers: asUser(ana.id),
      });

      const achados = resposta.json<Institution[]>();
      expect(
        achados.some((i) => i.acronym === 'IFNMG' && i.campus === 'Pirapora'),
        `busca por "${termo}" não achou o campus de Pirapora`,
      ).toBe(true);
    }
  });

  it('distingue campi da mesma instituição @spec:AC-041', async () => {
    const ana = await createTestUser();

    const resposta = await app.inject({
      method: 'GET',
      url: '/api/institutions?q=IFNMG',
      headers: asUser(ana.id),
    });

    const campi = resposta.json<Institution[]>().map((i) => i.campus);
    expect(new Set(campi).size).toBeGreaterThan(1);
    expect(campi).toContain('Pirapora');
  });

  it('deixa propor instituição ausente e usá-la na hora @spec:AC-042', async () => {
    const ana = await createTestUser();

    const resposta = await app.inject({
      method: 'POST',
      url: '/api/institutions/proposals',
      headers: asUser(ana.id),
      payload: { name: 'Faculdade Nova do Sertão', campus: 'Centro', acronym: 'FNS' },
    });

    expect(resposta.statusCode).toBe(201);
    const criada = resposta.json<Institution>();
    expect(criada.pending).toBe(true);

    // Usável imediatamente por quem propôs — sem ficar travado esperando aprovação.
    const perfil = await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: asUser(ana.id),
      payload: {
        name: 'Ana',
        institutionId: criada.id,
        cityId: (await referencias()).recife.id,
        course: 'Engenharia',
        bio: '',
        skillSlugs: [],
        links: [],
      },
    });
    expect(perfil.statusCode).toBe(200);
  });

  it('não mostra proposta pendente para outras pessoas @spec:AC-043', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);

    await app.inject({
      method: 'POST',
      url: '/api/institutions/proposals',
      headers: asUser(ana.id),
      payload: { name: 'Faculdade Reservada do Vale', campus: '', acronym: 'FRV' },
    });

    const paraOutro = await app.inject({
      method: 'GET',
      url: '/api/institutions?q=Reservada',
      headers: asUser(bruno.id),
    });
    expect(paraOutro.json<Institution[]>()).toEqual([]);

    const paraQuemPropos = await app.inject({
      method: 'GET',
      url: '/api/institutions?q=Reservada',
      headers: asUser(ana.id),
    });
    expect(paraQuemPropos.json<Institution[]>()).toHaveLength(1);
  });
});

describe('habilidades', () => {
  it('entrega o catálogo com categoria @spec:AC-044', async () => {
    const ana = await createTestUser();

    const resposta = await app.inject({ method: 'GET', url: '/api/skills', headers: asUser(ana.id) });

    const skills = resposta.json<{ slug: string; category: string }[]>();
    expect(skills.length).toBeGreaterThan(50);
    expect(skills.some((s) => s.slug === 'gemini')).toBe(true);
    expect(new Set(skills.map((s) => s.category)).size).toBeGreaterThan(3);
  });

  it('recusa habilidade fora do catálogo @spec:AC-045', async () => {
    const ana = await createTestUser();
    const { recife, ufpe } = await referencias();

    const resposta = await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: asUser(ana.id),
      payload: {
        name: 'Ana',
        institutionId: ufpe.id,
        cityId: recife.id,
        course: 'Engenharia',
        bio: '',
        skillSlugs: ['react', 'habilidade-inventada'],
        links: [],
      },
    });

    expect(resposta.statusCode).toBe(400);
    // E nada foi gravado pela metade.
    const gravado = await prisma.user.findUniqueOrThrow({
      where: { id: ana.id },
      select: { profileComplete: true },
    });
    expect(gravado.profileComplete).toBe(false);
  });
});

describe('diretório', () => {
  it('filtra por habilidade e por instituição @spec:AC-049', async () => {
    const { recife, ifnmg, ufpe } = await referencias();
    const leitor = await createTestUser();

    await embaixador({ nome: 'Ana', cityId: recife.id, institutionId: ifnmg.id, skills: ['react'] });
    await embaixador({ nome: 'Bruno', cityId: recife.id, institutionId: ufpe.id, skills: ['go'] });
    await embaixador({ nome: 'Carla', cityId: recife.id, institutionId: ufpe.id, completo: false });

    const porHabilidade = await app.inject({
      method: 'GET',
      url: '/api/directory?skill=react',
      headers: asUser(leitor.id),
    });
    expect(porHabilidade.json<DirectoryPage>().people.map((p) => p.name)).toEqual(['Ana']);

    const porInstituicao = await app.inject({
      method: 'GET',
      url: `/api/directory?institutionId=${ufpe.id}`,
      headers: asUser(leitor.id),
    });
    // Carla tem perfil incompleto e não entra.
    expect(porInstituicao.json<DirectoryPage>().people.map((p) => p.name)).toEqual(['Bruno']);
  });

  it('pagina sem repetir nem pular ninguém @spec:AC-050', async () => {
    const { recife, ufpe } = await referencias();
    const leitor = await createTestUser();

    for (let i = 0; i < 30; i += 1) {
      await embaixador({
        nome: `Pessoa ${String(i).padStart(2, '0')}`,
        cityId: recife.id,
        institutionId: ufpe.id,
      });
    }

    const vistos: string[] = [];
    let cursor: string | null = null;
    let voltas = 0;

    do {
      const url: string = cursor
        ? `/api/directory?cursor=${encodeURIComponent(cursor)}`
        : '/api/directory';
      const page: DirectoryPage = (
        await app.inject({ method: 'GET', url, headers: asUser(leitor.id) })
      ).json<DirectoryPage>();
      vistos.push(...page.people.map((p) => p.id));
      cursor = page.nextCursor;
      voltas += 1;
    } while (cursor && voltas < 6);

    expect(vistos).toHaveLength(30);
    expect(new Set(vistos).size).toBe(30);
  });

  it('não entrega e-mail de ninguém @principle:P-002', async () => {
    const { recife, ufpe } = await referencias();
    const leitor = await createTestUser();
    const ana = await embaixador({ nome: 'Ana', cityId: recife.id, institutionId: ufpe.id });

    const resposta = await app.inject({
      method: 'GET',
      url: '/api/directory',
      headers: asUser(leitor.id),
    });

    expect(resposta.body).not.toContain(ana.email);
  });
});

describe('mapa', () => {
  it('agrupa por cidade e conta as pessoas @spec:AC-051', async () => {
    const { recife, sp, ufpe } = await referencias();
    const leitor = await createTestUser();

    for (const nome of ['Ana', 'Bruno', 'Carla']) {
      await embaixador({ nome, cityId: recife.id, institutionId: ufpe.id });
    }
    await embaixador({ nome: 'Diego', cityId: sp.id, institutionId: ufpe.id });

    const pontos = (
      await app.inject({ method: 'GET', url: '/api/map', headers: asUser(leitor.id) })
    ).json<MapCity[]>();

    const porCidade = Object.fromEntries(pontos.map((p) => [p.city, p.count]));
    expect(porCidade).toEqual({ Recife: 3, 'São Paulo': 1 });
  });

  it('lista quem está na cidade ao clicar @spec:AC-052', async () => {
    const { recife, ufpe } = await referencias();
    const leitor = await createTestUser();
    await embaixador({ nome: 'Ana', cityId: recife.id, institutionId: ufpe.id });
    await embaixador({ nome: 'Bruno', cityId: recife.id, institutionId: ufpe.id });

    const pessoas = (
      await app.inject({
        method: 'GET',
        url: `/api/map/cities/${recife.id}`,
        headers: asUser(leitor.id),
      })
    ).json<AmbassadorCard[]>();

    expect(pessoas.map((p) => p.name)).toEqual(['Ana', 'Bruno']);
    // Cada pessoa traz o endereço do perfil dela, para o pino virar link.
    expect(pessoas.every((p) => p.slug.length > 0)).toBe(true);
  });

  it('não mostra quem optou por ficar fora do mapa @spec:AC-053 @principle:P-001', async () => {
    const { recife, ufpe } = await referencias();
    const leitor = await createTestUser();
    await embaixador({ nome: 'Ana', cityId: recife.id, institutionId: ufpe.id, visivel: true });
    const oculto = await embaixador({
      nome: 'Bruno',
      cityId: recife.id,
      institutionId: ufpe.id,
      visivel: false,
    });

    const pontos = (
      await app.inject({ method: 'GET', url: '/api/map', headers: asUser(leitor.id) })
    ).json<MapCity[]>();

    // Nem no ponto, nem na contagem.
    expect(pontos[0]?.count).toBe(1);
    expect(pontos[0]?.preview.map((p) => p.id)).not.toContain(oculto.id);

    const naCidade = (
      await app.inject({
        method: 'GET',
        url: `/api/map/cities/${recife.id}`,
        headers: asUser(leitor.id),
      })
    ).json<AmbassadorCard[]>();
    expect(naCidade.map((p) => p.id)).not.toContain(oculto.id);
  });

  it('devolve o centro do município, igual para todos da mesma cidade @spec:AC-054 @principle:P-001', async () => {
    const { recife, ufpe } = await referencias();
    const leitor = await createTestUser();
    await embaixador({ nome: 'Ana', cityId: recife.id, institutionId: ufpe.id });
    await embaixador({ nome: 'Bruno', cityId: recife.id, institutionId: ufpe.id });

    const pontos = (
      await app.inject({ method: 'GET', url: '/api/map', headers: asUser(leitor.id) })
    ).json<MapCity[]>();

    // Uma coordenada para a cidade inteira — não uma por pessoa.
    expect(pontos).toHaveLength(1);
    expect(pontos[0]?.latitude).toBe(recife.latitude);
    expect(pontos[0]?.longitude).toBe(recife.longitude);

    // E a resposta não carrega nenhum outro par de coordenadas escondido.
    const corpo = JSON.stringify(pontos);
    expect((corpo.match(/latitude/g) ?? []).length).toBe(1);
  });

  it('exige sessão', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/map' })).statusCode).toBe(401);
  });
});
