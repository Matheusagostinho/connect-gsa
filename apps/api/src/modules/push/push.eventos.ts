import type { PrismaClient } from '@connect-gsa/db';
import type { Env } from '../../env.js';
import { avisar, type Registro } from './push.service.js';

/**
 * Os avisos que a rede dispara, e o texto de cada um.
 *
 * Eles moram juntos por um motivo: o que aparece na tela bloqueada de alguém é
 * decisão de PRODUTO, não detalhe de rota. Espalhados pelos módulos, cada um
 * ganharia um tom e um limite diferentes — e o primeiro que vazasse dado a mais
 * passaria despercebido.
 *
 * ## A regra que vale para todos
 *
 * **Primeiro nome e para onde ir. Nada além disso.** Um aviso aparece na tela
 * bloqueada, à vista de quem estiver por perto — é a superfície MENOS privada do
 * produto. Nome completo já diz demais num ônibus lotado; e-mail e conteúdo
 * integral de publicação não entram de jeito nenhum (P-002).
 *
 * ## Falhar aqui nunca desfaz a ação
 *
 * Quem reagiu já reagiu. Se o serviço do fabricante estiver fora, a consequência
 * certa é ninguém receber o aviso — não a reação ser recusada. Todo disparo é
 * `void` e engolido dentro de `avisar`.
 */

interface Contexto {
  prisma: PrismaClient;
  env: Env;
  log: Registro;
}

/** Só o primeiro nome, e nunca vazio. */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? 'Alguém';
}

/**
 * Descobre quem deve ser avisado sobre uma publicação.
 *
 * Devolve `null` quando o autor é a própria pessoa que agiu: ninguém precisa
 * ser avisado de que reagiu à própria publicação.
 */
async function autorDoPost(
  prisma: PrismaClient,
  postId: string,
  quemAgiu: string,
): Promise<string | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post || post.authorId === quemAgiu) return null;
  return post.authorId;
}

async function nomeDe(prisma: PrismaClient, userId: string): Promise<string> {
  const pessoa = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return primeiroNome(pessoa?.name ?? 'Alguém');
}

export async function avisarReacao(
  { prisma, env, log }: Contexto,
  postId: string,
  quemReagiu: string,
): Promise<void> {
  const autor = await autorDoPost(prisma, postId, quemReagiu);
  if (!autor) return;

  await avisar(
    prisma,
    env,
    autor,
    {
      titulo: 'Nova reação',
      corpo: `${await nomeDe(prisma, quemReagiu)} reagiu à sua publicação.`,
      url: '/notificacoes',
      // Cinco reações na mesma publicação viram UM aviso, não cinco: a `tag`
      // faz o novo substituir o anterior do mesmo assunto.
      tag: `reacao:${postId}`,
    },
    log,
  );
}

export async function avisarComentario(
  { prisma, env, log }: Contexto,
  postId: string,
  quemComentou: string,
): Promise<void> {
  const autor = await autorDoPost(prisma, postId, quemComentou);
  if (!autor) return;

  await avisar(
    prisma,
    env,
    autor,
    {
      titulo: 'Novo comentário',
      // O TEXTO do comentário não entra: ele é livre, e mostrá-lo na tela
      // bloqueada entrega o que alguém escreveu a quem estiver por perto.
      corpo: `${await nomeDe(prisma, quemComentou)} comentou na sua publicação.`,
      url: '/notificacoes',
      tag: `comentario:${postId}`,
    },
    log,
  );
}

export async function avisarPedidoDeConexao(
  { prisma, env, log }: Contexto,
  paraQuem: string,
  quemPediu: string,
): Promise<void> {
  await avisar(
    prisma,
    env,
    paraQuem,
    {
      titulo: 'Pedido de conexão',
      corpo: `${await nomeDe(prisma, quemPediu)} quer se conectar com você.`,
      url: '/conexoes',
      tag: `conexao:${quemPediu}`,
    },
    log,
  );
}

export async function avisarConexaoAceita(
  { prisma, env, log }: Contexto,
  paraQuem: string,
  quemAceitou: string,
): Promise<void> {
  await avisar(
    prisma,
    env,
    paraQuem,
    {
      titulo: 'Conexão aceita',
      corpo: `${await nomeDe(prisma, quemAceitou)} aceitou seu pedido.`,
      url: '/conexoes',
      tag: `conexao:${quemAceitou}`,
    },
    log,
  );
}
