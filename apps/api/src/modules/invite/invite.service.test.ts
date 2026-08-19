import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestDb, createTestUser, resetTestData, testDb } from '../../testing/db.js';
import { generateInviteCode, hashInviteCode } from './invite.code.js';
import { claimInvite, createInvite, isEmailAllowed } from './invite.service.js';

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

    const invite = await createInvite(prisma, admin.id, { validityDays: 30 }, 'http://localhost:5173');

    // 32 hexadecimais = 128 bits de entropia.
    expect(invite.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);

    const stored = await prisma.inviteCode.findUniqueOrThrow({ where: { id: invite.id } });
    expect(stored.codeHash).toBe(hashInviteCode(invite.code));
    expect(stored.codeHash).not.toBe(invite.code);

    // Nenhuma coluna da linha guardada contém o código em claro.
    expect(JSON.stringify(stored)).not.toContain(invite.code);

    // Dois convites seguidos não se parecem.
    const outro = await createInvite(prisma, admin.id, { validityDays: 30 }, 'http://localhost:5173');
    expect(outro.code).not.toBe(invite.code);
  });

  it('aceita um convite válido uma vez e recusa a segunda @spec:AC-005', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const invite = await createInvite(prisma, admin.id, { validityDays: 30 }, 'http://localhost:5173');

    await expect(claimInvite(prisma, invite.code)).resolves.toMatchObject({ inviteId: invite.id });
    await expect(claimInvite(prisma, invite.code)).rejects.toThrow(/inválido, expirado ou já/i);
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

    await expect(claimInvite(prisma, code)).rejects.toThrow(/inválido, expirado ou já/i);
  });

  it('recusa código inexistente sem revelar o motivo', async () => {
    const inexistente = generateInviteCode();
    await expect(claimInvite(prisma, inexistente)).rejects.toThrow(/inválido, expirado ou já/i);

    // A mesma mensagem do convite já usado: nada de oráculo para quem varre.
    const admin = await createTestUser({ role: 'admin' });
    const invite = await createInvite(prisma, admin.id, { validityDays: 30 }, 'http://localhost:5173');
    await claimInvite(prisma, invite.code);

    const [erroInexistente, erroUsado] = await Promise.all([
      claimInvite(prisma, generateInviteCode()).catch((e: Error) => e.message),
      claimInvite(prisma, invite.code).catch((e: Error) => e.message),
    ]);
    expect(erroInexistente).toBe(erroUsado);
  });

  it('sob corrida, o mesmo convite é reservado por exatamente uma tentativa @spec:AC-007', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const invite = await createInvite(prisma, admin.id, { validityDays: 30 }, 'http://localhost:5173');

    const tentativas = await Promise.allSettled(
      Array.from({ length: 12 }, () => claimInvite(prisma, invite.code)),
    );

    const aceitas = tentativas.filter((t) => t.status === 'fulfilled');
    expect(aceitas).toHaveLength(1);
    expect(tentativas.filter((t) => t.status === 'rejected')).toHaveLength(11);
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
      { validityDays: 30 },
      'https://connectgsa.web.app',
    );

    expect(invite.shareUrl).toBe(`https://connectgsa.web.app/convite/${invite.code}`);
  });

  it('não duplica a barra quando a URL configurada termina em barra', async () => {
    const admin = await createTestUser({ role: 'admin' });

    const invite = await createInvite(
      prisma,
      admin.id,
      { validityDays: 30 },
      'https://connectgsa.web.app/',
    );

    expect(invite.shareUrl).not.toContain('//convite');
  });
});
