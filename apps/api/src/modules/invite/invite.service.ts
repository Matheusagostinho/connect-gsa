import type { PrismaClient } from '@connect-gsa/db';
import type { CreateInvite, CreatedInvite } from '@connect-gsa/shared';
import { badRequest, forbidden } from '../../plugins/errors.js';
import { generateInviteCode, hashInviteCode, looksLikeInviteCode } from './invite.code.js';

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/**
 * Mensagem única para todo motivo de recusa.
 *
 * Distinguir "não existe" de "já usado" de "expirado" entregaria, de graça, um
 * oráculo para quem estiver varrendo códigos: bastaria observar qual resposta
 * muda. O usuário legítimo recebe a orientação por outro canal (quem lhe deu o
 * convite), então nada se perde.
 */
const CONVITE_RECUSADO = 'Convite inválido, expirado ou já utilizado.';

export interface ClaimedInvite {
  inviteId: string;
}

export async function createInvite(
  prisma: PrismaClient,
  createdById: string,
  input: CreateInvite,
): Promise<CreatedInvite> {
  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + input.validityDays * DIA_EM_MS);

  const invite = await prisma.inviteCode.create({
    data: {
      codeHash: hashInviteCode(code),
      expiresAt,
      createdById,
      ...(input.note === undefined ? {} : { note: input.note }),
    },
    select: { id: true, expiresAt: true, note: true },
  });

  // Única vez em que o código em claro existe fora do cliente. Ele não é
  // logado, não é guardado e não pode ser recuperado depois.
  return {
    id: invite.id,
    code,
    expiresAt: invite.expiresAt.toISOString(),
    note: invite.note,
  };
}

/**
 * Reserva um convite de forma atômica (AC-007).
 *
 * O `updateMany` com `usedAt: null` no filtro é um compare-and-set executado
 * pelo próprio Postgres: das duas requisições que chegarem juntas com o mesmo
 * código, exatamente uma verá `count === 1`. Checar antes e gravar depois, em
 * dois passos, deixaria uma janela entre a leitura e a escrita — e é
 * exatamente essa janela que o teste de corrida explora.
 *
 * A reserva é deliberadamente irreversível: se a criação do usuário falhar
 * depois disso, o convite é perdido. Falhar fechado custa um convite; falhar
 * aberto custa um acesso indevido.
 */
export async function claimInvite(prisma: PrismaClient, code: string): Promise<ClaimedInvite> {
  if (!looksLikeInviteCode(code)) {
    // Barra a varredura de códigos malformados antes de tocar no banco.
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  return claimInviteByHash(prisma, hashInviteCode(code));
}

/**
 * Mesma reserva atômica, a partir do hash.
 *
 * É esta a versão usada no fluxo de OAuth: o código em claro fica no cliente
 * apenas até a validação inicial, e o que atravessa o vaivém do login social é
 * só o hash, dentro de um cookie assinado.
 */
export async function claimInviteByHash(
  prisma: PrismaClient,
  codeHash: string,
): Promise<ClaimedInvite> {
  const result = await prisma.inviteCode.updateMany({
    where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  if (result.count !== 1) {
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  const invite = await prisma.inviteCode.findUniqueOrThrow({
    where: { codeHash },
    select: { id: true },
  });

  return { inviteId: invite.id };
}

/** Vincula o convite já reservado ao usuário criado a partir dele. */
export async function attachInviteToUser(
  prisma: PrismaClient,
  inviteId: string,
  userId: string,
): Promise<void> {
  await prisma.inviteCode.update({ where: { id: inviteId }, data: { usedById: userId } });
}

/** Devolve a reserva quando o cadastro não chegou a acontecer. */
export async function releaseInvite(prisma: PrismaClient, inviteId: string): Promise<void> {
  await prisma.inviteCode.updateMany({
    where: { id: inviteId, usedById: null },
    data: { usedAt: null },
  });
}

/**
 * Confere se um convite está utilizável, SEM reservá-lo.
 *
 * Serve ao passo anterior ao login social: o embaixador digita o código e
 * precisa de retorno imediato se ele não presta, mas a reserva só pode
 * acontecer quando a conta for de fato criada — senão um login abandonado no
 * meio do caminho queimaria o convite de alguém.
 */
export async function checkInvite(prisma: PrismaClient, code: string): Promise<{ codeHash: string }> {
  if (!looksLikeInviteCode(code)) {
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  const codeHash = hashInviteCode(code);
  const invite = await prisma.inviteCode.findFirst({
    where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true },
  });

  if (!invite) {
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  return { codeHash };
}

/** Caminho alternativo ao convite: e-mail já aprovado pelo programa (Q-001). */
export async function isEmailAllowed(prisma: PrismaClient, email: string): Promise<boolean> {
  const found = await prisma.allowedEmail.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return found !== null;
}

export function assertCanCreateInvite(role: string): void {
  if (role !== 'admin' && role !== 'moderator') {
    throw forbidden('Só a coordenação do programa pode gerar convites.');
  }
}

export { CONVITE_RECUSADO };
