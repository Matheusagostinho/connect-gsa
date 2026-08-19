import type { PrismaClient } from '@connect-gsa/db';
import type { ConnectionState } from '@connect-gsa/shared';
import { badRequest, notFound } from '../../plugins/errors.js';

/**
 * O laço entre dois embaixadores.
 *
 * A decisão que sustenta tudo aqui: o par é guardado SEMPRE com o menor id
 * primeiro. Com a ordenação canônica, o índice único do banco passa a garantir
 * que A→B e B→A são o mesmo registro — sem ela, os dois seriam linhas distintas
 * e nada impediria dois pedidos opostos coexistirem (AC-057).
 */

/** Ordena o par. É o que torna o índice único uma garantia de simetria. */
export function canonicalPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export async function connectionStateFor(
  prisma: PrismaClient,
  viewerId: string,
  otherId: string,
): Promise<ConnectionState> {
  if (viewerId === otherId) return 'self';

  const registro = await prisma.connection.findUnique({
    where: { userAId_userBId: canonicalPair(viewerId, otherId) },
    select: { status: true, requestedById: true },
  });

  if (!registro) return 'none';
  if (registro.status === 'accepted') return 'connected';
  return registro.requestedById === viewerId ? 'pendingSent' : 'pendingReceived';
}

/** Estado de várias pessoas de uma vez — para o diretório não consultar por linha. */
export async function connectionStatesFor(
  prisma: PrismaClient,
  viewerId: string,
  outros: readonly string[],
): Promise<Map<string, ConnectionState>> {
  const estados = new Map<string, ConnectionState>();
  if (outros.length === 0) return estados;

  const registros = await prisma.connection.findMany({
    where: {
      OR: [
        { userAId: viewerId, userBId: { in: [...outros] } },
        { userBId: viewerId, userAId: { in: [...outros] } },
      ],
    },
    select: { userAId: true, userBId: true, status: true, requestedById: true },
  });

  for (const r of registros) {
    const outro = r.userAId === viewerId ? r.userBId : r.userAId;
    estados.set(
      outro,
      r.status === 'accepted'
        ? 'connected'
        : r.requestedById === viewerId
          ? 'pendingSent'
          : 'pendingReceived',
    );
  }

  estados.set(viewerId, 'self');
  return estados;
}

export async function requestConnection(
  prisma: PrismaClient,
  viewerId: string,
  otherId: string,
): Promise<ConnectionState> {
  if (viewerId === otherId) {
    throw badRequest('Você não pode se conectar consigo mesmo.', 'SELF_CONNECTION');
  }

  const alvo = await prisma.user.findFirst({
    where: { id: otherId, profileComplete: true },
    select: { id: true },
  });
  if (!alvo) throw notFound('Embaixador não encontrado.');

  const par = canonicalPair(viewerId, otherId);

  const existente = await prisma.connection.findUnique({
    where: { userAId_userBId: par },
    select: { id: true, status: true, requestedById: true },
  });

  if (existente) {
    // A outra pessoa já tinha pedido: aceitar é o desfecho óbvio, e obrigar a ir
    // até a lista de pedidos para clicar de novo só criaria atrito.
    if (existente.status === 'pending' && existente.requestedById !== viewerId) {
      await prisma.connection.update({
        where: { id: existente.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
      return 'connected';
    }
    return existente.status === 'accepted' ? 'connected' : 'pendingSent';
  }

  await prisma.connection.create({ data: { ...par, requestedById: viewerId } });
  return 'pendingSent';
}

export async function acceptConnection(
  prisma: PrismaClient,
  viewerId: string,
  otherId: string,
): Promise<ConnectionState> {
  const par = canonicalPair(viewerId, otherId);

  // `updateMany` com o filtro completo evita o vaivém de ler-depois-gravar: quem
  // não é o destinatário do pedido simplesmente não afeta nenhuma linha.
  const { count } = await prisma.connection.updateMany({
    where: { ...par, status: 'pending', requestedById: { not: viewerId } },
    data: { status: 'accepted', acceptedAt: new Date() },
  });

  if (count === 0) throw notFound('Não há pedido de conexão para aceitar.');

  return 'connected';
}

/** Recusa um pedido ou desfaz uma conexão — os dois apagam o mesmo registro. */
export async function removeConnection(
  prisma: PrismaClient,
  viewerId: string,
  otherId: string,
): Promise<ConnectionState> {
  await prisma.connection.deleteMany({ where: canonicalPair(viewerId, otherId) });
  return 'none';
}

/** Ids das pessoas conectadas, dos pedidos recebidos e dos enviados. */
export async function connectionBuckets(
  prisma: PrismaClient,
  viewerId: string,
): Promise<{ connected: string[]; received: string[]; sent: string[] }> {
  const registros = await prisma.connection.findMany({
    where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
    select: { userAId: true, userBId: true, status: true, requestedById: true },
    orderBy: { createdAt: 'desc' },
  });

  const buckets = { connected: [] as string[], received: [] as string[], sent: [] as string[] };

  for (const r of registros) {
    const outro = r.userAId === viewerId ? r.userBId : r.userAId;
    if (r.status === 'accepted') buckets.connected.push(outro);
    else if (r.requestedById === viewerId) buckets.sent.push(outro);
    else buckets.received.push(outro);
  }

  return buckets;
}
