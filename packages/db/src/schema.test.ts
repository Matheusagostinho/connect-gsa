import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guardas estruturais do schema.
 *
 * Estes testes não exercitam comportamento: eles impedem que uma decisão de
 * privacidade seja desfeita sem que ninguém perceba. Um `prisma migrate` que
 * reintroduza coordenada no `User` passaria por qualquer revisão distraída —
 * mas não passa por aqui.
 */

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');

/** Recorta o corpo de um modelo do schema, para asserções não vazarem entre modelos. */
function modelBody(name: string): string {
  const match = new RegExp(`\\nmodel ${name} \\{([\\s\\S]*?)\\n\\}`).exec(schema);
  if (!match?.[1]) throw new Error(`modelo ${name} não encontrado no schema`);
  return match[1];
}

describe('schema do banco', () => {
  it('não guarda coordenada precisa de nenhum embaixador @spec:AC-011 @principle:P-001', () => {
    const user = modelBody('User');

    // A palavra pode aparecer em comentário; o que não pode existir é a COLUNA.
    const columns = user
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('@@'))
      .map((line) => line.split(/\s+/)[0]);

    expect(columns).not.toContain('latitude');
    expect(columns).not.toContain('longitude');
    expect(columns).not.toContain('lat');
    expect(columns).not.toContain('lng');
  });

  it('guarda o centroide no município, que é a granularidade máxima de localização', () => {
    const city = modelBody('City');

    expect(city).toMatch(/latitude\s+Float/);
    expect(city).toMatch(/longitude\s+Float/);
    expect(city).toMatch(/ibgeCode\s+String\s+@unique/);
  });

  it('coloca o perfil no mapa por padrão @spec:AC-015 @spec:AC-127', () => {
    // Invertido em 2026-08-19 (P-011). O padrão era `false`, e a razão era boa:
    // padrão pré-marcado em algo de localização é o que "opt-in consciente"
    // existe para evitar. A troca foi decisão do dono do produto, e o que a
    // sustenta continua no schema — o mapa conhece o município, nunca endereço.
    expect(modelBody('User')).toMatch(/visibleOnMap\s+Boolean\s+@default\(true\)/);
  });

  it('guarda apenas o hash do convite, nunca o código em claro @principle:P-009', () => {
    const invite = modelBody('InviteCode');

    expect(invite).toMatch(/codeHash\s+String\s+@unique/);
    expect(invite).not.toMatch(/^\s*code\s+String/m);
    // `usedById @unique` é o que faz o BANCO recusar o segundo uso do convite,
    // mesmo se duas requisições passarem pela checagem da aplicação juntas.
    expect(invite).toMatch(/usedById\s+String\?\s+@unique/);
  });
});
