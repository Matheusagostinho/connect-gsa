/**
 * Slug do perfil: o endereço público de um embaixador.
 *
 * Derivado do nome no PRIMEIRO salvamento e nunca reescrito quando a pessoa
 * muda o nome de exibição (ASM-016). Parece incoerente ver `/perfil/ana-ribeiro`
 * numa pessoa que hoje se chama outra coisa — mas o contrário é pior: um
 * endereço que já circulou em conversa e deixou de funcionar.
 *
 * A pessoa PODE trocá-lo de propósito, e aí vale a mesma preocupação: por isso
 * o endereço anterior fica guardado e continua respondendo, e existe intervalo
 * mínimo entre trocas. Sem o intervalo, cada troca deixaria mais um endereço
 * morto para trás e isso não teria fim.
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

/**
 * Quantos dias entre uma troca de nome de usuário e a seguinte.
 *
 * Guardamos apenas UM endereço anterior. Trocar duas vezes seguidas jogaria fora
 * o primeiro — que é justamente o que mais circulou — sem ninguém perceber.
 */
export const DIAS_ENTRE_TROCAS = 30;

/** Formato aceito: o mesmo que `slugify` produz, para não haver endereço impronunciável. */
const FORMATO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MIN = 3;
export const SLUG_MAX = 30;

export type SlugRecusa =
  | 'formato'
  | 'comprimento'
  | 'reservado'
  | 'em-uso'
  | 'muito-cedo';

export const MOTIVO: Record<SlugRecusa, string> = {
  formato: 'Use apenas letras minúsculas, números e hífen.',
  comprimento: `O nome de usuário precisa ter entre ${SLUG_MIN} e ${SLUG_MAX} caracteres.`,
  reservado: 'Esse nome de usuário é reservado pelo site.',
  'em-uso': 'Esse nome de usuário já está em uso.',
  'muito-cedo': `Você só pode trocar o nome de usuário a cada ${DIAS_ENTRE_TROCAS} dias.`,
};

/**
 * Valida um nome de usuário escolhido pela pessoa.
 *
 * Função pura, com `existe` injetado: a regra é testável sem Postgres, e as
 * recusas viram um valor em vez de uma exceção — quem chama decide o que fazer
 * com cada motivo.
 */
export async function validarSlugEscolhido(
  escolhido: string,
  opcoes: {
    existe: (candidato: string) => Promise<boolean>;
    trocadoEm: Date | null;
    agora: Date;
  },
): Promise<SlugRecusa | null> {
  const valor = escolhido.trim().toLowerCase();

  if (valor.length < SLUG_MIN || valor.length > SLUG_MAX) return 'comprimento';
  if (!FORMATO.test(valor)) return 'formato';
  // Um endereço igual a uma rota do site tornaria `/perfil/mapa` ambíguo para
  // sempre — e a ambiguidade só apareceria no dia em que alguém a explorasse.
  if (RESERVADOS.has(valor)) return 'reservado';

  if (opcoes.trocadoEm) {
    const dias = (opcoes.agora.getTime() - opcoes.trocadoEm.getTime()) / 86_400_000;
    if (dias < DIAS_ENTRE_TROCAS) return 'muito-cedo';
  }

  if (await opcoes.existe(valor)) return 'em-uso';

  return null;
}

export { RESERVADOS };
