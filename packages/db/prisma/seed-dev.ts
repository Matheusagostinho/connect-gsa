import 'dotenv/config';
import { createPrismaClient } from '../src/client.js';

/**
 * Semeia dados de DESENVOLVIMENTO: pessoas fictícias para você navegar pelo
 * aplicativo sem precisar de credenciais OAuth.
 *
 * Recusa-se a rodar com `NODE_ENV=production` — estas contas não têm dono e
 * entrariam na rede sem passar pelo portão de convite.
 *
 * Os e-mails usam o domínio `example.invalid`, reservado justamente para isso:
 * não existe e nunca vai existir, então nada aqui pode colidir com uma pessoa
 * real nem receber mensagem por engano.
 */

const PESSOAS = [
  {
    email: 'ana.admin@example.invalid',
    name: 'Ana Ribeiro',
    role: 'admin' as const,
    course: 'Ciência da Computação',
    bio: 'Coordeno o capítulo e organizo os encontros do programa.',
    skills: ['Comunidade', 'Python', 'Gemini'],
    city: { name: 'Recife', state: 'PE' },
    institution: 'UFPE',
    visibleOnMap: true,
  },
  {
    email: 'bruno.moderador@example.invalid',
    name: 'Bruno Tavares',
    role: 'moderator' as const,
    course: 'Sistemas de Informação',
    bio: 'Modero o quadro de avisos e ajudo quem está chegando agora.',
    skills: ['Android', 'Kotlin'],
    city: { name: 'Belo Horizonte', state: 'MG' },
    institution: 'UFMG',
    visibleOnMap: true,
  },
  {
    email: 'carla.embaixadora@example.invalid',
    name: 'Carla Nogueira',
    role: 'ambassador' as const,
    course: 'Engenharia de Software',
    bio: 'Estudo IA aplicada a acessibilidade e adoro falar sobre isso.',
    skills: ['React', 'TypeScript', 'Acessibilidade'],
    city: { name: 'São Paulo', state: 'SP' },
    institution: 'USP',
    visibleOnMap: false,
  },
  {
    email: 'diego.novato@example.invalid',
    name: 'Diego Alencar',
    role: 'ambassador' as const,
    // Sem curso, cidade nem instituição: serve para você ver o onboarding
    // sendo exigido antes de circular pela rede (AC-009).
    course: null,
    bio: '',
    skills: [],
    city: null,
    institution: null,
    visibleOnMap: false,
  },
];

async function main(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('seed-dev não roda em produção: estas contas não passam pelo portão de convite');
  }

  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL não definida');

  const prisma = createPrismaClient(connectionString);

  try {
    for (const pessoa of PESSOAS) {
      const city = pessoa.city
        ? await prisma.city.findFirst({ where: pessoa.city, select: { id: true } })
        : null;
      const institution = pessoa.institution
        ? await prisma.institution.findFirst({
            where: { acronym: pessoa.institution },
            select: { id: true },
          })
        : null;

      const dados = {
        name: pessoa.name,
        emailVerified: true,
        role: pessoa.role,
        course: pessoa.course,
        bio: pessoa.bio,
        skills: pessoa.skills,
        visibleOnMap: pessoa.visibleOnMap,
        profileComplete: city !== null && institution !== null,
        cityId: city?.id ?? null,
        institutionId: institution?.id ?? null,
      };

      await prisma.user.upsert({
        where: { email: pessoa.email },
        update: dados,
        create: { email: pessoa.email, ...dados },
      });
    }

    // Deixa o e-mail de quem for testar o OAuth real já liberado, e um convite
    // válido em mãos — os dois caminhos de entrada disponíveis de imediato.
    const convidante = await prisma.user.findUniqueOrThrow({
      where: { email: 'ana.admin@example.invalid' },
      select: { id: true },
    });

    const { createHash, randomBytes } = await import('node:crypto');
    const codigo = randomBytes(16).toString('hex');
    await prisma.inviteCode.create({
      data: {
        codeHash: createHash('sha256').update(codigo).digest('hex'),
        note: 'convite de desenvolvimento',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdById: convidante.id,
      },
    });

    process.stdout.write(
      `${PESSOAS.length} pessoas de desenvolvimento prontas.\n` +
        `Convite válido para testar o fluxo de entrada: ${codigo}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
