import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPrismaClient } from '../src/client.js';

/**
 * Popula as tabelas de referência: municípios e instituições de ensino.
 *
 * É idempotente — roda quantas vezes for preciso, em qualquer ambiente, sem
 * duplicar nada. Não cria usuário, convite nem sessão: dado de pessoa nunca
 * entra por seed.
 */

interface CitySeed {
  ibgeCode: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface InstitutionSeed {
  name: string;
  campus: string;
  acronym: string;
}

interface SkillSeed {
  slug: string;
  name: string;
  category: string;
}

async function readJson<T>(relativePath: string): Promise<T> {
  const url = new URL(relativePath, import.meta.url);
  return JSON.parse(await readFile(fileURLToPath(url), 'utf8')) as T;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida — copie .env.example para .env');
  }

  const prisma = createPrismaClient(connectionString);

  try {
    const cities = await readJson<CitySeed[]>('./data/cities.json');
    const institutions = await readJson<InstitutionSeed[]>('./data/institutions.json');
    const skills = await readJson<SkillSeed[]>('./data/skills.json');

    // `skipDuplicates` sobre a chave única `ibgeCode` é o que torna o seed
    // repetível: reexecutar não recria nem sobrescreve o que já existe.
    const citiesResult = await prisma.city.createMany({ data: cities, skipDuplicates: true });
    const institutionsResult = await prisma.institution.createMany({
      data: institutions,
      skipDuplicates: true,
    });
    const skillsResult = await prisma.skill.createMany({ data: skills, skipDuplicates: true });

    process.stdout.write(
      `municípios inseridos: ${citiesResult.count} (total no arquivo: ${cities.length})\n` +
        `instituições e campi inseridos: ${institutionsResult.count} (total: ${institutions.length})\n` +
        `habilidades inseridas: ${skillsResult.count} (total: ${skills.length})\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
