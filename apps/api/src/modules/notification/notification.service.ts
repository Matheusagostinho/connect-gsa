import type { PrismaClient } from '@connect-gsa/db';
import type { Notification, NotificationFeed } from '@connect-gsa/shared';

/**
 * Notificações derivadas.
 *
 * Não existe tabela de notificação. Pedidos de conexão, reações e comentários já
 * estão no banco com data e autor — o que faltava era juntá-los e saber até onde
 * a pessoa já tinha olhado. Uma tabela própria significaria escrever duas vezes
 * o mesmo fato e conviver com a chance de as duas versões divergirem.
 *
 * O limite: esta consulta cresce com o volume de interações. Para algumas
 * centenas de embaixadores é barata; se a rede passar de alguns milhares, o
 * desenho precisa mudar para escrita antecipada (ASM-019). O sinal de que chegou
 * a hora é o tempo desta rota, não um palpite.
 */

/** Notificação sobre coisa antiga deixa de ser notícia e vira histórico. */
const JANELA_DIAS = 30;

/** Teto por tipo, para uma pessoa muito popular não estourar a resposta. */
const LIMITE_POR_TIPO = 40;

const AUTOR_SELECT = { id: true, slug: true, name: true, image: true } as const;

interface AutorRow {
  id: string;
  slug: string | null;
  name: string;
  image: string | null;
}

const toActor = (a: AutorRow): Notification['actor'] => ({
  id: a.id,
  slug: a.slug ?? a.id,
  name: a.name,
  imageUrl: a.image,
});

/** Trecho curto do post, para a notificação dizer a que ela se refere. */
const excerpt = (content: string): string =>
  content.length <= 80 ? content : `${content.slice(0, 79)}…`;

export async function listNotifications(
  prisma: PrismaClient,
  userId: string,
): Promise<NotificationFeed> {
  const desde = new Date(Date.now() - JANELA_DIAS * 86_400_000);

  const [usuario, conexoes, reacoes, comentarios] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { notificationsSeenAt: true },
    }),

    // Pedidos recebidos e conexões aceitas: os dois lados do mesmo registro.
    prisma.connection.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        createdAt: { gte: desde },
      },
      select: {
        id: true,
        status: true,
        requestedById: true,
        createdAt: true,
        acceptedAt: true,
        userAId: true,
        userA: { select: AUTOR_SELECT },
        userB: { select: AUTOR_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_POR_TIPO,
    }),

    prisma.postReaction.findMany({
      where: {
        post: { authorId: userId },
        // A pessoa não precisa saber que reagiu ao próprio post (AC-068).
        userId: { not: userId },
        createdAt: { gte: desde },
      },
      select: {
        id: true,
        kind: true,
        createdAt: true,
        user: { select: AUTOR_SELECT },
        post: { select: { id: true, content: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_POR_TIPO,
    }),

    prisma.comment.findMany({
      where: {
        post: { authorId: userId },
        authorId: { not: userId },
        createdAt: { gte: desde },
      },
      select: {
        id: true,
        createdAt: true,
        author: { select: AUTOR_SELECT },
        post: { select: { id: true, content: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: LIMITE_POR_TIPO,
    }),
  ]);

  const vistoAte = usuario.notificationsSeenAt;
  const itens: Notification[] = [];

  for (const c of conexoes) {
    const outro = c.userAId === userId ? c.userB : c.userA;
    const euPedi = c.requestedById === userId;

    // Pedido recebido: notifica quem foi convidado, não quem convidou.
    if (c.status === 'pending' && !euPedi) {
      itens.push({
        id: `connection-request:${c.id}`,
        kind: 'connectionRequest',
        createdAt: c.createdAt.toISOString(),
        unread: !vistoAte || c.createdAt > vistoAte,
        actor: toActor(outro),
        post: null,
        reaction: null,
      });
    }

    // Aceite: notifica quem pediu, que é quem estava esperando resposta.
    if (c.status === 'accepted' && euPedi && c.acceptedAt) {
      itens.push({
        id: `connection-accepted:${c.id}`,
        kind: 'connectionAccepted',
        createdAt: c.acceptedAt.toISOString(),
        unread: !vistoAte || c.acceptedAt > vistoAte,
        actor: toActor(outro),
        post: null,
        reaction: null,
      });
    }
  }

  for (const r of reacoes) {
    itens.push({
      id: `reaction:${r.id}`,
      kind: 'reaction',
      createdAt: r.createdAt.toISOString(),
      unread: !vistoAte || r.createdAt > vistoAte,
      actor: toActor(r.user),
      post: { id: r.post.id, excerpt: excerpt(r.post.content) },
      reaction: r.kind,
    });
  }

  for (const c of comentarios) {
    itens.push({
      id: `comment:${c.id}`,
      kind: 'comment',
      createdAt: c.createdAt.toISOString(),
      unread: !vistoAte || c.createdAt > vistoAte,
      actor: toActor(c.author),
      post: { id: c.post.id, excerpt: excerpt(c.post.content) },
      reaction: null,
    });
  }

  itens.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return {
    notifications: itens,
    unreadCount: itens.filter((i) => i.unread).length,
  };
}

/**
 * Só o contador, para a navegação.
 *
 * A navegação aparece em toda tela; carregar a lista inteira a cada visita seria
 * desperdício. Aqui contamos sem montar objeto nenhum.
 */
export async function countUnread(prisma: PrismaClient, userId: string): Promise<number> {
  const usuario = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { notificationsSeenAt: true },
  });

  const desde = new Date(Date.now() - JANELA_DIAS * 86_400_000);
  const depoisDe = usuario.notificationsSeenAt ?? desde;
  const recorte = depoisDe > desde ? depoisDe : desde;

  const [pedidos, aceites, reacoes, comentarios] = await Promise.all([
    prisma.connection.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'pending',
        requestedById: { not: userId },
        createdAt: { gt: recorte },
      },
    }),
    prisma.connection.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'accepted',
        requestedById: userId,
        acceptedAt: { gt: recorte },
      },
    }),
    prisma.postReaction.count({
      where: { post: { authorId: userId }, userId: { not: userId }, createdAt: { gt: recorte } },
    }),
    prisma.comment.count({
      where: { post: { authorId: userId }, authorId: { not: userId }, createdAt: { gt: recorte } },
    }),
  ]);

  return pedidos + aceites + reacoes + comentarios;
}

/**
 * Marca tudo como visto.
 *
 * "Visto" não apaga: a lista continua igual, só para de contar como nova
 * (AC-067). Apagar tiraria da pessoa a chance de voltar e responder depois.
 */
export async function markSeen(prisma: PrismaClient, userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { notificationsSeenAt: new Date() },
  });
}
