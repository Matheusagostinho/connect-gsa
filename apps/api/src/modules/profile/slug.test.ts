import { describe, expect, it } from 'vitest';
import { buildUniqueSlug, slugify } from './slug.js';

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
