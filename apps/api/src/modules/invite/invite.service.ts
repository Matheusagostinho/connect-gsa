import type { PrismaClient } from '@connect-gsa/db';
import { INVITE_QUOTA, type CreateInvite, type CreatedInvite } from '@connect-gsa/shared';
import { badRequest, forbidden } from '../../plugins/errors.js';
import { generateInviteCode, hashInviteCode, looksLikeInviteCode } from './invite.code.js';

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/**
 * Mensagem única para todo motivo de recusa.
 *
 * Distinguir "não existe" de "expirado" entregaria, de graça, um oráculo para
 * quem estiver varrendo códigos: bastaria observar qual resposta muda. O
 * usuário legítimo recebe a orientação por outro canal (quem lhe deu o
 * convite), então nada se perde.
 *
 * "Já utilizado" saiu da lista porque deixou de ser motivo de recusa — o
 * convite atende quantas pessoas o receberem.
 */
const CONVITE_RECUSADO = 'Convite inválido ou expirado.';

export interface ResolvedInvite {
  inviteId: string;
}

/**
 * Quantos convites esta pessoa ainda pode criar no período.
 *
 * Conta os CRIADOS, não os usados. É mais restritivo de propósito: contar
 * usados deixaria alguém gerar cem links de uma vez e espalhá-los, e o teto só
 * apareceria depois que o estrago já estivesse na rua.
 *
 * Coordenação e moderação não têm teto — o teto existe para uma conta de
 * embaixador comprometida não virar torneira, e quem tem o papel já pode fazer
 * coisas piores.
 */
export async function invitesRestantes(
  prisma: PrismaClient,
  userId: string,
  role: string,
): Promise<number | null> {
  if (role === 'moderator' || role === 'admin') return null;

  const desde = new Date(Date.now() - INVITE_QUOTA.days * DIA_EM_MS);
  const criados = await prisma.inviteCode.count({
    where: { createdById: userId, createdAt: { gte: desde } },
  });

  return Math.max(0, INVITE_QUOTA.max - criados);
}

export async function createInvite(
  prisma: PrismaClient,
  createdById: string,
  input: CreateInvite,
  webUrl: string,
  role = 'ambassador',
): Promise<CreatedInvite> {
  const restantes = await invitesRestantes(prisma, createdById, role);
  if (restantes !== null && restantes <= 0) {
    throw forbidden(
      `Você já criou ${INVITE_QUOTA.max} convites nos últimos ${INVITE_QUOTA.days} dias. Espere um pouco para criar outro.`,
      'INVITE_QUOTA',
    );
  }

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
    shareUrl: `${webUrl.replace(/\/+$/, '')}/convite/${code}`,
    expiresAt: invite.expiresAt.toISOString(),
    note: invite.note,
  };
}

/**
 * Confere se um convite pode ser usado. NÃO reserva nada.
 *
 * Chamava-se `claimInvite` e era um compare-and-set atômico: o `updateMany` com
 * `usedAt: null` no filtro fazia o Postgres deixar exatamente uma das
 * requisições simultâneas passar. Essa trava saiu junto com o uso único
 * (P-009, emendado em 2026-08-20) — o convite agora vale para quantas pessoas
 * receberem o link, então não há o que disputar e "reservar" seria mentira no
 * nome da função.
 *
 * O que sobrou como portão é o PRAZO, conferido aqui e em toda outra leitura.
 */
export async function resolveInvite(prisma: PrismaClient, code: string): Promise<ResolvedInvite> {
  if (!looksLikeInviteCode(code)) {
    // Barra a varredura de códigos malformados antes de tocar no banco.
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  return resolveInviteByHash(prisma, hashInviteCode(code));
}

/**
 * Mesma conferência, a partir do hash.
 *
 * É esta a versão usada no fluxo de OAuth: o código em claro fica no cliente
 * apenas até a validação inicial, e o que atravessa o vaivém do login social é
 * só o hash, dentro de um cookie assinado.
 */
export async function resolveInviteByHash(
  prisma: PrismaClient,
  codeHash: string,
): Promise<ResolvedInvite> {
  const invite = await prisma.inviteCode.findFirst({
    where: { codeHash, expiresAt: { gt: new Date() } },
    select: { id: true },
  });

  if (!invite) {
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  return { inviteId: invite.id };
}

/**
 * Vincula o convite ao usuário criado a partir dele, e grava a INDICAÇÃO.
 *
 * São dois registros com vidas diferentes, e é por isso que existem os dois:
 *
 * - `User.invitedViaId` diz por qual convite a pessoa entrou. Vira nulo se o
 *   convite sumir — e ele suma junto com quem o emitiu, porque a linha do
 *   convite tem cascade.
 * - `User.invitedById` diz quem trouxe a pessoa para a rede. É um FATO, não um
 *   papel consumido: sobrevive à exclusão de quem convidou e é o que vai
 *   alimentar a gamificação.
 *
 * A gravação é uma transação: o convite marcado como usado sem a indicação
 * registrada seria um buraco silencioso no histórico, descoberto só quando
 * alguém fosse contar pontos.
 *
 * Quem emitiu o convite sai do próprio `update`, e não de uma leitura anterior.
 * Ler fora da transação abria uma janela: se essa pessoa excluísse a conta
 * entre a leitura e a escrita, a chave estrangeira recusaria o `invitedById` e
 * o CADASTRO INTEIRO falharia — o portão fechando na cara de quem tinha convite
 * válido. Dentro da transação, o valor lido é o valor gravado.
 */
export async function attachInviteToUser(
  prisma: PrismaClient,
  inviteId: string,
  userId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const invite = await tx.inviteCode.update({
      where: { id: inviteId },
      data: { lastUsedAt: new Date() },
      select: { createdById: true },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        invitedViaId: inviteId,
        // Convite que a pessoa gerou para si mesma não a indica: ninguém a trouxe.
        ...(invite.createdById === userId ? {} : { invitedById: invite.createdById }),
      },
    });
  });
}

/** Quantas pessoas entraram por este convite. */
export async function contarUsos(prisma: PrismaClient, inviteId: string): Promise<number> {
  return prisma.user.count({ where: { invitedViaId: inviteId } });
}

/** Quantas pessoas entraram pelos convites desta. */
export async function contarIndicacoes(prisma: PrismaClient, userId: string): Promise<number> {
  return prisma.user.count({ where: { invitedById: userId } });
}

/**
 * Confere o código digitado, no passo anterior ao login social.
 *
 * Devolve o hash porque é ele — nunca o código em claro — que atravessa o
 * vaivém do OAuth, dentro de um cookie assinado.
 */
export async function checkInvite(prisma: PrismaClient, code: string): Promise<{ codeHash: string }> {
  const codeHash = hashInviteCode(code);
  await resolveInvite(prisma, code);
  return { codeHash };
}

/**
 * Quem convidou, para a página do convite.
 *
 * Devolve só o PRIMEIRO NOME. O nome completo transformaria o link num jeito de
 * descobrir quem está na rede sem entrar nela — e a rede ser fechada é o ponto.
 *
 * A recusa é a mesma dos outros caminhos e para os dois motivos que restaram
 * (não existe, expirado): responder diferente entregaria de graça o oráculo que
 * o limite de tentativas existe para negar (AC-136).
 */
export async function invitationFor(
  prisma: PrismaClient,
  code: string,
): Promise<{ invitedBy: string; expiresAt: string }> {
  if (!looksLikeInviteCode(code)) {
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  const invite = await prisma.inviteCode.findFirst({
    where: { codeHash: hashInviteCode(code), expiresAt: { gt: new Date() } },
    select: { expiresAt: true, createdBy: { select: { name: true } } },
  });

  if (!invite) {
    throw badRequest(CONVITE_RECUSADO, 'INVITE_REJECTED');
  }

  return {
    invitedBy: (invite.createdBy?.name ?? 'Alguém').trim().split(/\s+/)[0] ?? 'Alguém',
    expiresAt: invite.expiresAt.toISOString(),
  };
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
