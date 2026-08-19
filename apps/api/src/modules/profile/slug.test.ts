import { describe, expect, it } from 'vitest';
import { DIAS_ENTRE_TROCAS, buildUniqueSlug, slugify, validarSlugEscolhido } from './slug.js';

const nunca = () => Promise.resolve(false);
const jaExiste = (ocupados: string[]) => (c: string) => Promise.resolve(ocupados.includes(c));

describe('slug do perfil', () => {
  it('tira acento e espaço do nome @spec:AC-046', () => {
    expect(slugify('Ana Ribeiro')).toBe('ana-ribeiro');
    expect(slugify('João D\'Ávila Gonçalves')).toBe('joao-d-avila-goncalves');
    expect(slugify('  Maria   Clara  ')).toBe('maria-clara');
  });

  it('não deixa o slug terminar em hífen depois do corte', () => {
    const longo = slugify('a'.repeat(38) + ' sobrenome');
    expect(longo.endsWith('-')).toBe(false);
    expect(longo.length).toBeLessThanOrEqual(40);
  });

  it('não produz slug vazio quando o nome não tem letra latina', () => {
    expect(slugify('🚀🚀')).toBe('embaixador');
    expect(slugify('中文名')).toBe('embaixador');
  });

  it('desvia de nomes que colidiriam com rotas da aplicação', async () => {
    // Sem isso, alguém chamado "Perfil" ocuparia /e/perfil e o roteador teria
    // duas leituras possíveis para o mesmo endereço.
    await expect(buildUniqueSlug('Mapa', nunca)).resolves.toBe('mapa-1');
    await expect(buildUniqueSlug('Admin', nunca)).resolves.toBe('admin-1');
  });

  it('numera homônimos em ordem previsível', async () => {
    await expect(buildUniqueSlug('Ana Ribeiro', jaExiste(['ana-ribeiro']))).resolves.toBe(
      'ana-ribeiro-2',
    );
    await expect(
      buildUniqueSlug('Ana Ribeiro', jaExiste(['ana-ribeiro', 'ana-ribeiro-2'])),
    ).resolves.toBe('ana-ribeiro-3');
  });

  it('não trava quando há homônimos demais', async () => {
    const muitos = ['ana-ribeiro', ...Array.from({ length: 60 }, (_, i) => `ana-ribeiro-${i + 2}`)];

    const slug = await buildUniqueSlug('Ana Ribeiro', jaExiste(muitos));

    expect(slug).toMatch(/^ana-ribeiro-[a-z0-9]{5}$/);
  });
});

describe('trocar o nome de usuário', () => {
  const AGORA = new Date('2026-08-19T12:00:00Z');
  const livre = () => Promise.resolve(false);
  const ocupado = () => Promise.resolve(true);

  it('recusa o que já está em uso @spec:AC-117', async () => {
    const recusa = await validarSlugEscolhido('ana-ribeiro', {
      existe: ocupado,
      trocadoEm: null,
      agora: AGORA,
    });

    expect(recusa).toBe('em-uso');
  });

  it('recusa palavra reservada pelo site @spec:AC-117', async () => {
    // Um endereço igual a uma rota tornaria `/perfil/mapa` ambíguo para sempre,
    // e a ambiguidade só apareceria no dia em que alguém a explorasse.
    for (const reservada of ['mapa', 'admin', 'perfil']) {
      expect(
        await validarSlugEscolhido(reservada, { existe: livre, trocadoEm: null, agora: AGORA }),
      ).toBe('reservado');
    }
  });

  it('recusa formato que não vira endereço legível @spec:AC-117', async () => {
    for (const invalido of ['Ana Ribeiro', 'ana_ribeiro', '-ana', 'ana--ribeiro', 'ana!']) {
      expect(
        await validarSlugEscolhido(invalido, { existe: livre, trocadoEm: null, agora: AGORA }),
      ).not.toBeNull();
    }
  });

  it('recusa troca antes do intervalo mínimo @spec:AC-119', async () => {
    const dezDiasAtras = new Date(AGORA.getTime() - 10 * 86_400_000);

    // Guardamos apenas UM endereço anterior: trocar duas vezes seguidas jogaria
    // fora justamente o que mais circulou.
    expect(
      await validarSlugEscolhido('ana-nova', {
        existe: livre,
        trocadoEm: dezDiasAtras,
        agora: AGORA,
      }),
    ).toBe('muito-cedo');
  });

  it('aceita depois do intervalo @spec:AC-119', async () => {
    const antes = new Date(AGORA.getTime() - (DIAS_ENTRE_TROCAS + 1) * 86_400_000);

    expect(
      await validarSlugEscolhido('ana-nova', { existe: livre, trocadoEm: antes, agora: AGORA }),
    ).toBeNull();
  });

  it('aceita um nome livre e bem formado na primeira troca @spec:AC-117', async () => {
    expect(
      await validarSlugEscolhido('ana-dev-2026', { existe: livre, trocadoEm: null, agora: AGORA }),
    ).toBeNull();
  });
});
