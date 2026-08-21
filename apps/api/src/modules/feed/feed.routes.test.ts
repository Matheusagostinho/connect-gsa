import type { FeedPage } from '@connect-gsa/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asUser, buildTestApp } from '../../testing/app.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';

const prisma = testDb();
let app: FastifyInstance;

/** Cria posts direto no banco para controlar a data — o que a rota não permite. */
async function semeiaPosts(authorId: string, quantidade: number, minutosAtras = 0) {
  const agora = Date.now();
  return prisma.post.createManyAndReturn({
    data: Array.from({ length: quantidade }, (_, i) => ({
      authorId,
      content: `post ${i}`,
      createdAt: new Date(agora - (minutosAtras + i) * 60_000),
    })),
    select: { id: true },
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

async function pagina(userId: string, cursor?: string): Promise<FeedPage> {
  const url = cursor ? `/api/feed?cursor=${encodeURIComponent(cursor)}` : '/api/feed';
  const response = await app.inject({ method: 'GET', url, headers: asUser(userId) });
  expect(response.statusCode).toBe(200);
  return response.json<FeedPage>();
}

describe('feed', () => {
  it('exige sessão @spec:AC-019', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/feed' });
    expect(response.statusCode).toBe(401);
  });

  it('devolve feed vazio sem quebrar', async () => {
    const ana = await createTestUser();

    await expect(pagina(ana.id)).resolves.toEqual({ posts: [], nextCursor: null });
  });

  it('pagina sem repetir nem pular post @spec:AC-039', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    // 45 posts de dois autores: mais de duas páginas, e com diversidade de autor
    // reordenando a lista — que é justamente o cenário em que um cursor por data
    // se perderia.
    await semeiaPosts(ana.id, 23);
    await semeiaPosts(bruno.id, 22);

    const vistos: string[] = [];
    let cursor: string | null = null;
    let voltas = 0;

    do {
      const page: FeedPage = await pagina(ana.id, cursor ?? undefined);
      vistos.push(...page.posts.map((p) => p.id));
      cursor = page.nextCursor;
      voltas += 1;
    } while (cursor && voltas < 10);

    expect(vistos).toHaveLength(45);
    expect(new Set(vistos).size).toBe(45);
  });

  it('não deixa post publicado no meio da rolagem embaralhar as páginas @spec:AC-039', async () => {
    const ana = await createTestUser();
    await semeiaPosts(ana.id, 30);

    const primeira = await pagina(ana.id);
    expect(primeira.nextCursor).not.toBeNull();

    // Alguém publica ENTRE uma página e outra.
    await app.inject({
      method: 'POST',
      url: '/api/posts',
      headers: asUser(ana.id),
      payload: { content: 'post publicado no meio da rolagem' },
    });

    const segunda = await pagina(ana.id, primeira.nextCursor ?? undefined);

    const idsPrimeira = new Set(primeira.posts.map((p) => p.id));
    const repetidos = segunda.posts.filter((p) => idsPrimeira.has(p.id));
    expect(repetidos).toEqual([]);
  });

  it('recusa cursor inválido em vez de devolver a primeira página em silêncio', async () => {
    const ana = await createTestUser();

    const response = await app.inject({
      method: 'GET',
      url: '/api/feed?cursor=lixo-que-nao-decodifica',
      headers: asUser(ana.id),
    });

    expect(response.statusCode).toBe(400);
  });

  it('põe o post mais engajado à frente @spec:AC-035', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const [parado, engajado] = await semeiaPosts(ana.id, 2);

    await app.inject({
      method: 'POST',
      url: `/api/posts/${engajado!.id}/reaction`,
      headers: asUser(bruno.id),
      payload: { reaction: 'together' },
    });

    const { posts } = await pagina(bruno.id);

    expect(posts[0]?.id).toBe(engajado!.id);
    expect(posts[0]?.reactionCounts).toEqual({ together: 1 });
    expect(posts[1]?.id).toBe(parado!.id);
  });

  it('traz a minha reação marcada no post', async () => {
    const [ana, bruno] = await Promise.all([createTestUser(), createTestUser()]);
    const [post] = await semeiaPosts(ana.id, 1);

    await app.inject({
      method: 'POST',
      url: `/api/posts/${post!.id}/reaction`,
      headers: asUser(bruno.id),
      payload: { reaction: 'offerHelp' },
    });

    const meu = await pagina(bruno.id);
    const dela = await pagina(ana.id);

    expect(meu.posts[0]?.myReaction).toBe('offerHelp');
    expect(dela.posts[0]?.myReaction).toBeNull();
  });
});

describe('abas do feed', () => {
  /** Conexão exige perfil concluído dos dois lados — como em produção. */
  async function comPerfil(nome: string) {
    const [city, institution] = await Promise.all([
      prisma.city.findFirstOrThrow({ where: { name: 'Recife', state: 'PE' } }),
      prisma.institution.findFirstOrThrow({ where: { acronym: 'UFPE' } }),
    ]);
    const user = await createTestUser();
    return prisma.user.update({
      where: { id: user.id },
      data: {
        name: nome,
        slug: `${nome.toLowerCase()}-${user.id.slice(0, 6)}`,
        course: 'Engenharia',
        profileComplete: true,
        cityId: city.id,
        institutionId: institution.id,
      },
    });
  }

  const pagina = async (userId: string, tab: string): Promise<FeedPage> =>
    (
      await app.inject({ method: 'GET', url: `/api/feed?tab=${tab}`, headers: asUser(userId) })
    ).json<FeedPage>();

  it('"Seguindo" traz só conexões e o próprio perfil @spec:AC-097', async () => {
    const [ana, conexao, estranho] = await Promise.all([
      comPerfil('Ana'),
      comPerfil('Conexao'),
      comPerfil('Estranho'),
    ]);

    await Promise.all([
      semeiaPosts(ana.id, 1),
      semeiaPosts(conexao.id, 1),
      semeiaPosts(estranho.id, 1),
    ]);

    await app.inject({
      method: 'POST',
      url: `/api/connections/${conexao.id}`,
      headers: asUser(ana.id),
    });
    await app.inject({
      method: 'POST',
      url: `/api/connections/${ana.id}/accept`,
      headers: asUser(conexao.id),
    });

    const seguindo = await pagina(ana.id, 'following');
    const autores = new Set(seguindo.posts.map((p) => p.author.id));

    expect(autores).toEqual(new Set([ana.id, conexao.id]));
    expect(autores.has(estranho.id)).toBe(false);
  });

  it('"Para você" mostra a rede inteira, mesmo sem afinidade nenhuma @spec:AC-099', async () => {
    const [ana, estranho] = await Promise.all([createTestUser(), createTestUser()]);
    await semeiaPosts(estranho.id, 3);

    const paraVoce = await pagina(ana.id, 'forYou');

    // Um filtro rígido deixaria a tela inicial de quem chegou agora vazia.
    expect(paraVoce.posts).toHaveLength(3);
  });

  it('recusa aba desconhecida em vez de escolher uma por conta própria', async () => {
    const ana = await createTestUser();

    const resposta = await app.inject({
      method: 'GET',
      url: '/api/feed?tab=inventada',
      headers: asUser(ana.id),
    });

    expect(resposta.statusCode).toBe(400);
  });

  it('traz o estado da conexão com quem publicou, para o cartão poder convidar @spec:AC-101', async () => {
    const [ana, outro] = await Promise.all([createTestUser(), createTestUser()]);
    await semeiaPosts(outro.id, 1);
    await semeiaPosts(ana.id, 1);

    const { posts } = await pagina(ana.id, 'forYou');

    const meu = posts.find((p) => p.author.id === ana.id);
    const alheio = posts.find((p) => p.author.id === outro.id);

    expect(meu?.author.connection).toBe('self');
    expect(alheio?.author.connection).toBe('none');
  });
});

describe('o estado de conexão no feed', () => {
  it('mostra quem já é conexão como conectado, não como "conectar"', async () => {
    const ana = await createTestUser();
    const bruno = await createTestUser();

    await prisma.connection.create({
      data: {
        userAId: ana.id < bruno.id ? ana.id : bruno.id,
        userBId: ana.id < bruno.id ? bruno.id : ana.id,
        status: 'accepted',
        requestedById: bruno.id,
      },
    });

    await semeiaPosts(bruno.id, 1);

    const { posts } = await pagina(ana.id);
    const doBruno = posts.find((p) => p.author.id === bruno.id);

    // `toPost` recebe `connection` como último parâmetro COM PADRÃO 'none'.
    // O feed montava os posts por um caminho próprio e esquecia esse argumento,
    // então todo post dizia "não conectado" e o botão oferecia conectar com quem
    // já era conexão. O padrão silencioso é o que escondeu o esquecimento — sem
    // erro de tipo, sem teste vermelho.
    expect(doBruno?.author.connection).toBe('connected');
  });

  it('mostra a própria publicação como `self`', async () => {
    const ana = await createTestUser();
    await semeiaPosts(ana.id, 1);

    const { posts } = await pagina(ana.id);

    expect(posts[0]?.author.connection).toBe('self');
  });
});
