import { describe, expect, it } from 'vitest';
import { getAuthTables } from 'better-auth/db';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O schema do Prisma contra o que o Better Auth REALMENTE pede.
 *
 * Este teste nasceu de um defeito que só apareceu no primeiro login com o Google
 * em produção: a versão 1.7 passou a consultar `Account` por `issuer`, a coluna
 * não existia, e o Prisma recusou a consulta dentro de `findAccountOwnerByKey`.
 * O login inteiro morria com `internal_server_error` — sem dizer qual campo
 * faltava, e sem nenhum teste vermelho.
 *
 * A razão de escapar: o `testUtils` grava pelo `internalAdapter` e não passa
 * pelo caminho de VÍNCULO de conta do OAuth, que é o único que lê `issuer`.
 * Nenhuma suíte cobre o retorno real de um provedor, e cobrir de verdade exigiria
 * credencial de OAuth.
 *
 * Então o teste não simula o fluxo: ele compara os CONTRATOS. Se uma atualização
 * do Better Auth pedir um campo novo, isto fica vermelho aqui, na máquina de
 * quem atualizou — e não no primeiro login de um embaixador.
 */
const schema = readFileSync(
  join(import.meta.dirname, '../../../../packages/db/prisma/schema.prisma'),
  'utf8',
);

function camposDoModelo(modelo: string): Set<string> {
  const corpo = new RegExp(`model ${modelo} \\{([\\s\\S]*?)\\n\\}`).exec(schema);
  if (!corpo) throw new Error(`model ${modelo} não existe no schema.prisma`);
  return new Set([...corpo[1]!.matchAll(/^ {2}(\w+)\s/gm)].map((m) => m[1]!));
}

describe('schema do Prisma × contrato do Better Auth', () => {
  const tabelas = getAuthTables({});

  it.each([
    ['user', 'User'],
    ['session', 'Session'],
    ['account', 'Account'],
    ['verification', 'Verification'],
  ])('a tabela %s tem todos os campos que a biblioteca consulta', (tabela, modelo) => {
    const esperados = Object.keys(tabelas[tabela]?.fields ?? {});
    const nossos = camposDoModelo(modelo);

    const faltando = esperados.filter((campo) => !nossos.has(campo));

    expect(faltando, `${modelo} não tem: ${faltando.join(', ')}`).toEqual([]);
  });

  it('o par único de Account é [issuer, accountId], não [providerId, accountId]', () => {
    // O 1.7 moveu o índice. Com o par antigo, duas identidades de emissores
    // diferentes com o mesmo `accountId` colidiriam — e a busca do login não
    // acharia nenhuma.
    expect(schema).toMatch(/@@unique\(\[issuer, accountId\]\)/);
    expect(schema).not.toMatch(/@@unique\(\[providerId, accountId\]\)/);
  });
});

describe('a entrada pelo Google', () => {
  it('sempre pede o seletor de conta, em vez de deixar o Google escolher', async () => {
    const { buildAuthOptions } = await import('./better-auth.js');
    const { testEnv } = await import('../testing/app.js');
    const { testDb } = await import('../testing/db.js');

    const opcoes = buildAuthOptions(testDb(), testEnv);

    // Sem `prompt`, quem já tem sessão no Google entra em SILÊNCIO com a conta
    // ativa. No celular isso escolheu a conta errada, o portão recusou, e a
    // mensagem falava de convite — sem pista de que o problema era a conta.
    expect(opcoes.socialProviders.google).toMatchObject({ prompt: 'select_account' });
  });
});
