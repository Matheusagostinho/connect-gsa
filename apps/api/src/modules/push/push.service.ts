import type { PrismaClient } from '@connect-gsa/db';
import type { PushPayload, PushSubscriptionInput } from '@connect-gsa/shared';
import webpush from 'web-push';
import type { Env } from '../../env.js';

/**
 * Aviso por notificação, com o aplicativo fechado.
 *
 * As notificações continuam DERIVADAS do que já está no banco (ASM-019) — este
 * módulo não as duplica. Ele é um **canal de entrega** para o que já é
 * calculado, e o que ele guarda é o APARELHO inscrito.
 *
 * ## Falhar aqui nunca desfaz a ação que gerou o aviso
 *
 * Quem reagiu, comentou ou pediu conexão já fez o que queria fazer. Se o serviço
 * de push do fabricante estiver fora, ou se a inscrição tiver morrido, a
 * consequência certa é ninguém receber o aviso — não a reação ser recusada.
 * Por isso todo envio é engolido, e só o registro fica.
 */

/** Sem chaves configuradas, o recurso simplesmente não existe — e isso é ok. */
export function pushConfigurado(env: Env): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

function configurar(env: Env): void {
  webpush.setVapidDetails(env.VAPID_SUBJECT!, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

/**
 * Guarda o aparelho, sem duplicar.
 *
 * `upsert` pelo `endpoint`: o mesmo aparelho autorizando duas vezes devolve o
 * mesmo endpoint, e sem isso a tabela ganharia uma linha por autorização — e a
 * pessoa receberia o aviso em duplicata.
 *
 * O `userId` é atualizado no conflito de propósito: num computador
 * compartilhado, o aparelho passa a ser de quem está logado AGORA. Sem isso, a
 * inscrição antiga continuaria entregando avisos de outra pessoa naquela
 * máquina.
 */
export async function inscrever(
  prisma: PrismaClient,
  userId: string,
  inscricao: PushSubscriptionInput,
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: inscricao.endpoint },
    create: {
      endpoint: inscricao.endpoint,
      p256dh: inscricao.keys.p256dh,
      auth: inscricao.keys.auth,
      userId,
    },
    update: { p256dh: inscricao.keys.p256dh, auth: inscricao.keys.auth, userId },
  });
}

/** Tira o aparelho da lista. Chamado ao sair da conta e ao desautorizar. */
export async function desinscrever(prisma: PrismaClient, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function estaInscrito(prisma: PrismaClient, userId: string): Promise<boolean> {
  const encontrada = await prisma.pushSubscription.findFirst({
    where: { userId },
    select: { id: true },
  });
  return encontrada !== null;
}

export interface Registro {
  warn: (dados: Record<string, unknown>, mensagem: string) => void;
}

/**
 * Manda o aviso para todos os aparelhos de uma pessoa.
 *
 * ## A limpeza de inscrição morta não é higiene, é necessidade
 *
 * Quando alguém desinstala o aplicativo ou revoga a permissão, o serviço do
 * fabricante passa a responder **404** ou **410** para aquele endpoint —
 * permanentemente. Sem apagar, a tabela vira um cemitério que é percorrido a
 * cada aviso, e o tempo de envio cresce com o número de gente que SAIU.
 *
 * Outros erros (500 do fabricante, rede fora) são passageiros e a inscrição
 * fica: apagar por causa de uma instabilidade tiraria o aviso de quem não fez
 * nada errado.
 */
export async function avisar(
  prisma: PrismaClient,
  env: Env,
  userId: string,
  payload: PushPayload,
  log: Registro,
): Promise<void> {
  if (!pushConfigurado(env)) return;

  const inscricoes = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (inscricoes.length === 0) return;

  configurar(env);
  const corpo = JSON.stringify(payload);
  const mortas: string[] = [];

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          corpo,
        );
      } catch (erro) {
        const status = (erro as { statusCode?: number }).statusCode;

        if (status === 404 || status === 410) {
          mortas.push(inscricao.id);
          return;
        }

        // Só o status, nunca o corpo nem o endpoint: o endpoint identifica o
        // aparelho de uma pessoa, e log é log (P-005).
        log.warn({ status }, 'falha ao entregar aviso por notificação');
      }
    }),
  );

  if (mortas.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: mortas } } });
  }
}
