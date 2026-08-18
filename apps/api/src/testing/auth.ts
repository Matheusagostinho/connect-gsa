import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { buildAuthOptions } from '../auth/better-auth.js';
import type { TestHelpers } from './helpers.js';
import { testEnv } from './app.js';
import { testDb } from './db.js';

/**
 * Instância do Better Auth para os testes.
 *
 * Ela reusa `buildAuthOptions` — a MESMA configuração de produção, com o mesmo
 * portão de entrada, o mesmo vínculo de contas e os mesmos atributos de cookie —
 * e apenas acrescenta o plugin `testUtils`, que expõe ajudas para criar usuário
 * e sessão sem simular o vaivém do OAuth.
 *
 * O plugin é acoplado aqui, e não por parâmetro em `createAuth`, para que a
 * instância de produção não tenha como carregar acidentalmente ajudas de teste.
 *
 * Sobre os dois casts abaixo: o `init` do `testUtils` declara `options` como
 * possivelmente `undefined`, o que o tipo `BetterAuthPlugin` não aceita sob o
 * nosso `exactOptionalPropertyTypes: true`. É uma inconsistência dos tipos da
 * biblioteca, não do nosso uso. Preferimos isolá-la nestas duas linhas, dentro
 * de código de teste, a desligar a checagem no projeto inteiro por causa dela.
 */
export const testAuth = betterAuth({
  ...buildAuthOptions(testDb(), testEnv),
  plugins: [testUtils() as unknown as BetterAuthPlugin],
});

export async function testHelpers(): Promise<TestHelpers> {
  const ctx = await testAuth.$context;
  return (ctx as unknown as { test: TestHelpers }).test;
}
