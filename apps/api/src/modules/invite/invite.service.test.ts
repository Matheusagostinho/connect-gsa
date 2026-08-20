import { INVITE_VALIDITY_DAYS } from '@connect-gsa/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';
import { generateInviteCode, hashInviteCode } from './invite.code.js';
import {
  attachInviteToUser,
  contarIndicacoes,
  contarUsos,
  createInvite,
  isEmailAllowed,
  resolveInvite,
} from './invite.service.js';

const prisma = testDb();

beforeEach(async () => {
  await resetTestData();
});

afterAll(async () => {
  await closeTestDb();
});

describe('convites', () => {
  it('gera código imprevisível e nunca guarda o código em claro @principle:P-009', async () => {
    const admin = await createTestUser({ role: 'admin' });

    const invite = await createInvite(prisma, admin.id, { validityDays: INVITE_VALIDITY_DAYS }, 'http://localhost:5173');

    // 8 caracteres de um alfabeto de 32, sem I, L, O e U: 40 bits. O P-009
    // registra por que 40 bastam e por que já foram 128.
    expect(invite.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);

    const stored = await prisma.inviteCode.findUniqueOrThrow({ where: { id: invite.id } });
    expect(stored.codeHash).toBe(hashInviteCode(invite.code));
    expect(stored.codeHash).not.toBe(invite.code);

    // Nenhuma coluna da linha guardada contém o código em claro.
    expect(JSON.stringify(stored)).not.toContain(invite.code);

    // Dois convites seguidos não se parecem.
    const outro = await createInvite(prisma, admin.id, { validityDays: INVITE_VALIDITY_DAYS }, 'http://localhost:5173');
    expect(outro.code).not.toBe(invite.code);
  });

  it('o mesmo convite serve para mais de uma pessoa @spec:AC-005 @spec:AC-146', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const invite = await createInvite(prisma, admin.id, { validityDays: INVITE_VALIDITY_DAYS }, 'http://localhost:5173');

    // Invertido em 2026-08-20 (P-009). Antes a segunda chamada era recusada.
    await expect(resolveInvite(prisma, invite.code)).resolves.toMatchObject({
      inviteId: invite.id,
    });
    await expect(resolveInvite(prisma, invite.code)).resolves.toMatchObject({
      inviteId: invite.id,
    });
  });

  it('recusa convite vencido @spec:AC-006', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const code = generateInviteCode();
    await prisma.inviteCode.create({
      data: {
        codeHash: hashInviteCode(code),
        expiresAt: new Date(Date.now() - 1000),
        createdById: admin.id,
      },
    });

    await expect(resolveInvite(prisma, code)).rejects.toThrow(/inválido ou expirado/i);
  });

  it('recusa inexistente e vencido com a MESMA mensagem @spec:AC-150', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const vencido = generateInviteCode();
    await prisma.inviteCode.create({
      data: {
        codeHash: hashInviteCode(vencido),
        expiresAt: new Date(Date.now() - 1000),
        createdById: admin.id,
      },
    });

    // Sobraram dois motivos de recusa, e eles precisam ser indistinguíveis:
    // responder diferente entrega o oráculo que o limite de tentativas nega.
    const [erroInexistente, erroVencido] = await Promise.all([
      resolveInvite(prisma, generateInviteCode()).catch((e: Error) => e.message),
      resolveInvite(prisma, vencido).catch((e: Error) => e.message),
    ]);
    expect(erroInexistente).toBe(erroVencido);
  });

  it('sob corrida, todas as tentativas passam @spec:AC-007 @spec:AC-147', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const invite = await createInvite(prisma, admin.id, { validityDays: INVITE_VALIDITY_DAYS }, 'http://localhost:5173');

    const tentativas = await Promise.allSettled(
      Array.from({ length: 12 }, () => resolveInvite(prisma, invite.code)),
    );

    // Invertido em 2026-08-20. Antes exatamente uma passava, e a trava era o
    // compare-and-set no `usedAt`. O que este teste guarda agora é que tirar a
    // trava não introduziu erro sob concorrência — nenhuma tentativa falha.
    expect(tentativas.filter((t) => t.status === 'rejected')).toHaveLength(0);
  });

  it('reconhece e-mail pré-aprovado pelo programa', async () => {
    await prisma.allowedEmail.create({ data: { email: 'ana@uni.br' } });

    await expect(isEmailAllowed(prisma, 'ana@uni.br')).resolves.toBe(true);
    // A comparação normaliza caixa e espaços — e-mail é case-insensitive na prática.
    await expect(isEmailAllowed(prisma, '  ANA@UNI.BR ')).resolves.toBe(true);
    await expect(isEmailAllowed(prisma, 'outra@uni.br')).resolves.toBe(false);
  });
});

describe('link de convite', () => {
  it('devolve um endereço pronto para compartilhar @spec:AC-059', async () => {
    const admin = await createTestUser({ role: 'admin' });

    const invite = await createInvite(
      prisma,
      admin.id,
      { validityDays: INVITE_VALIDITY_DAYS },
      'https://connectgsa.web.app',
    );

    expect(invite.shareUrl).toBe(`https://connectgsa.web.app/convite/${invite.code}`);
  });

  it('não duplica a barra quando a URL configurada termina em barra', async () => {
    const admin = await createTestUser({ role: 'admin' });

    const invite = await createInvite(
      prisma,
      admin.id,
      { validityDays: INVITE_VALIDITY_DAYS },
      'https://connectgsa.web.app/',
    );

    expect(invite.shareUrl).not.toContain('//convite');
  });
});

describe('indicação', () => {
  it('entrar por convite registra quem indicou @spec:AC-139', async () => {
    const ana = await createTestUser({ role: 'admin' });
    const bruno = await createTestUser();
    const invite = await createInvite(prisma, ana.id, { validityDays: INVITE_VALIDITY_DAYS }, 'http://localhost:5173');

    const { inviteId } = await resolveInvite(prisma, invite.code);
    await attachInviteToUser(prisma, inviteId, bruno.id);

    const gravado = await prisma.user.findUniqueOrThrow({
      where: { id: bruno.id },
      select: { invitedById: true },
    });

    expect(gravado.invitedById).toBe(ana.id);
  });

  it('quem entra sem convite não ganha indicador @spec:AC-140', async () => {
    const carla = await createTestUser();

    // Inventar um indicador para quem entrou pela lista aprovada seria registrar
    // um fato falso — e um fato falso vira ponto falso quando houver pontuação.
    const gravado = await prisma.user.findUniqueOrThrow({
      where: { id: carla.id },
      select: { invitedById: true },
    });

    expect(gravado.invitedById).toBeNull();
  });

  it('excluir quem convidou NÃO apaga quem foi convidado @spec:AC-141', async () => {
    const ana = await createTestUser({ role: 'admin' });
    const bruno = await createTestUser();
    const invite = await createInvite(prisma, ana.id, { validityDays: INVITE_VALIDITY_DAYS }, 'http://localhost:5173');
    const { inviteId } = await resolveInvite(prisma, invite.code);
    await attachInviteToUser(prisma, inviteId, bruno.id);

    await prisma.user.delete({ where: { id: ana.id } });

    // Com `onDelete: Cascade` na chave estrangeira, esta linha teria sumido — e
    // o defeito só apareceria no dia em que alguém saísse do programa.
    const sobreviveu = await prisma.user.findUnique({
      where: { id: bruno.id },
      select: { invitedById: true },
    });

    expect(sobreviveu).not.toBeNull();
    expect(sobreviveu?.invitedById).toBeNull();
  });

  it('três pessoas por UM convite dão três indicações @spec:AC-148', async () => {
    const ana = await createTestUser({ role: 'admin' });
    const invite = await createInvite(prisma, ana.id, { validityDays: INVITE_VALIDITY_DAYS }, 'http://localhost:5173');

    // Um link só, três pessoas. Antes isto exigia três convites: a indicação é
    // por PESSOA, e é justamente por isso que ela não mora no convite.
    for (let i = 0; i < 3; i += 1) {
      const convidado = await createTestUser();
      const { inviteId } = await resolveInvite(prisma, invite.code);
      await attachInviteToUser(prisma, inviteId, convidado.id);
    }

    await expect(contarIndicacoes(prisma, ana.id)).resolves.toBe(3);
    await expect(contarUsos(prisma, invite.id)).resolves.toBe(3);
  });
});
