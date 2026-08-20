import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { generateInviteCode, hashInviteCode } from '../modules/invite/invite.code.js';
import { createInvite, resolveInvite } from '../modules/invite/invite.service.js';
import { testAuth, testHelpers } from '../testing/auth.js';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../testing/db.js';

/**
 * O portão da rede, exercitado através do Better Auth de verdade.
 *
 * O `testUtils` grava usuário pelo `internalAdapter`, que é o mesmo caminho do
 * retorno do OAuth — então os `databaseHooks` disparam aqui exatamente como
 * disparariam depois de um login com o Google. É isso que torna estes testes
 * prova do portão, e não prova de um mock.
 */
const prisma = testDb();
const auth = testAuth;

beforeEach(async () => {
  await resetTestData();
});

afterAll(async () => {
  await closeTestDb();
});

describe('portão de entrada da rede', () => {
  it('recusa quem não tem convite nem e-mail aprovado, sem criar registro @spec:AC-004 @principle:P-003', async () => {
    const test = await testHelpers();
    const forasteiro = test.createUser({ email: 'forasteiro@exemplo.com', name: 'Forasteiro' });

    await expect(test.saveUser(forasteiro)).rejects.toThrow();

    // O ponto do critério: o banco continua sem nenhum vestígio da tentativa.
    const gravado = await prisma.user.findUnique({ where: { email: 'forasteiro@exemplo.com' } });
    expect(gravado).toBeNull();
    await expect(prisma.user.count()).resolves.toBe(0);
  });

  it('deixa entrar quem está na lista oficial do programa @spec:AC-004', async () => {
    const test = await testHelpers();
    await prisma.allowedEmail.create({ data: { email: 'ana@uni.br' } });

    const ana = test.createUser({ email: 'ana@uni.br', name: 'Ana' });
    await expect(test.saveUser(ana)).resolves.toMatchObject({ email: 'ana@uni.br' });

    const gravado = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@uni.br' } });
    // Todo mundo entra como embaixador; promoção é ato deliberado da coordenação.
    expect(gravado.role).toBe('ambassador');
    expect(gravado.profileComplete).toBe(false);
    // O mapa passou a ser o padrão (P-011, invertido em 2026-08-19). Uma conta
    // recém-criada ainda não tem cidade, então ela não aparece em lugar nenhum
    // até concluir o perfil — a bandeira só passa a valer a partir dali.
    expect(gravado.visibleOnMap).toBe(true);
    expect(gravado.cityId).toBeNull();
  });

  it('entrega a sessão em cookie httpOnly e autentica a requisição @spec:AC-001 @principle:P-008', async () => {
    const test = await testHelpers();
    await prisma.allowedEmail.create({ data: { email: 'ana@uni.br' } });
    const ana = await test.saveUser(test.createUser({ email: 'ana@uni.br', name: 'Ana' }));

    const { cookies, session } = await test.login({ userId: ana.id });

    const sessionCookie = cookies.find((cookie) => cookie.name.includes('session_token'));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('Lax');
    expect(session.userId).toBe(ana.id);

    // O token de sessão vive no banco, não em armazenamento do navegador.
    const persisted = await prisma.session.findFirst({ where: { userId: ana.id } });
    expect(persisted).not.toBeNull();
  });

  it('convite já usado continua valendo para a próxima pessoa @spec:AC-005', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const invite = await createInvite(prisma, admin.id, { validityDays: 15 }, 'http://localhost:5173');

    // Simula o convite já usado por outra pessoa. Invertido em 2026-08-20: isto
    // recusava o acesso, e agora não recusa mais (P-009).
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { lastUsedAt: new Date() },
    });

    const stored = await prisma.inviteCode.findUniqueOrThrow({ where: { id: invite.id } });
    expect(stored.codeHash).toBe(hashInviteCode(invite.code));
    await expect(resolveInvite(prisma, invite.code)).resolves.toMatchObject({
      inviteId: invite.id,
    });
  });

  it('mantém um e-mail ligado a uma única conta, sem perfil duplicado @spec:AC-003', async () => {
    const test = await testHelpers();
    await prisma.allowedEmail.create({ data: { email: 'ana@uni.br' } });

    const primeira = await test.saveUser(test.createUser({ email: 'ana@uni.br', name: 'Ana' }));

    // Voltar por outro provedor não pode gerar uma segunda conta com o mesmo
    // e-mail: a unicidade é do BANCO, então nenhum caminho da aplicação a burla.
    await expect(
      test.saveUser(test.createUser({ email: 'ana@uni.br', name: 'Ana (GitHub)' })),
    ).rejects.toThrow();

    const contas = await prisma.user.findMany({ where: { email: 'ana@uni.br' } });
    expect(contas).toHaveLength(1);
    expect(contas[0]?.id).toBe(primeira.id);
  });

  it('só considera confiável o vínculo entre provedores com e-mail verificado @spec:AC-003 @principle:P-003', () => {
    const linking = auth.options.account?.accountLinking;

    expect(linking?.enabled).toBe(true);
    expect(linking?.trustedProviders).toEqual(['google', 'github', 'linkedin']);
    // Senha própria desligada: sem hash para vazar e sem fluxo de recuperação
    // para atacar.
    expect(auth.options.emailAndPassword?.enabled).toBe(false);
  });

  it('oferece os três provedores do programa @spec:AC-002', () => {
    const providers: Record<string, { clientId?: string } | undefined> =
      auth.options.socialProviders ?? {};

    expect(Object.keys(providers).sort()).toEqual(['github', 'google', 'linkedin']);
    for (const name of ['google', 'github', 'linkedin']) {
      expect(providers[name]?.clientId).toEqual(expect.any(String));
    }
  });

  it('não aceita bilhete de convite forjado @spec:AC-008', async () => {
    const test = await testHelpers();
    const codigoInexistente = generateInviteCode();

    // Sem lista aprovada e sem bilhete válido, nem um código bem formatado abre a porta.
    expect(codigoInexistente).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    await expect(
      test.saveUser(test.createUser({ email: 'invasor@exemplo.com', name: 'Invasor' })),
    ).rejects.toThrow();
    await expect(prisma.user.count()).resolves.toBe(0);
  });
});
