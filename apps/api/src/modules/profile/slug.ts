/**
 * Slug do perfil: o endereço público e estável de um embaixador.
 *
 * Derivado do nome no PRIMEIRO salvamento e nunca reescrito quando a pessoa
 * muda o nome de exibição (ASM-016). Parece incoerente ver `/e/ana-ribeiro`
 * numa pessoa que hoje se chama outra coisa — mas o contrário é pior: um
 * endereço que já circulou em conversa e deixou de funcionar.
 */

const RESERVADOS = new Set([
  'admin',
  'api',
  'convite',
  'entrar',
  'dev',
  'feed',
  'perfil',
  'mapa',
  'diretorio',
  'conexoes',
  'sair',
  'me',
  's',
  'e',
]);

export function slugify(name: string): string {
  const base = name
    .normalize('NFKD')
    // Remove os acentos depois de separá-los das letras.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

  return base.length >= 2 ? base : 'embaixador';
}

/**
 * Encontra um slug livre a partir do nome.
 *
 * `existe` é injetado em vez de o módulo consultar o banco: assim a regra de
 * desempate é testável sem Postgres, e o formato do sufixo não depende de
 * quantas pessoas já existem na base de teste.
 */
export async function buildUniqueSlug(
  name: string,
  existe: (candidato: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name);
  const inicio = RESERVADOS.has(base) ? `${base}-1` : base;

  if (!(await existe(inicio))) return inicio;

  // Sufixo numérico curto e previsível. Aleatório seria mais fácil, e daria
  // endereços feios para a primeira pessoa de nome comum a chegar.
  for (let n = 2; n <= 50; n += 1) {
    const candidato = `${base}-${n}`;
    if (!(await existe(candidato))) return candidato;
  }

  // Saída de emergência: com 50 homônimos, previsibilidade deixa de importar.
  return `${base}-${Date.now().toString(36).slice(-5)}`;
}

export { RESERVADOS };
