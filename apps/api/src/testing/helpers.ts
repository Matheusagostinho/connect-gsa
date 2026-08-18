/**
 * As ajudas do plugin `testUtils` que realmente usamos.
 *
 * Declaradas aqui porque o tipo `TestHelpers` da biblioteca não sobrevive ao
 * cast necessário em `auth.ts` (ver o comentário lá). Mantendo esta interface
 * enxuta, os testes continuam tipados de verdade: errar o nome de um campo do
 * usuário ou esquecer um `await` ainda quebra o typecheck.
 */
export interface TestSessionCookie {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
}

export interface TestUserRecord {
  id: string;
  email: string;
  name: string;
}

export interface TestHelpers {
  createUser(overrides?: Record<string, unknown>): TestUserRecord;
  saveUser(user: TestUserRecord): Promise<TestUserRecord>;
  login(opts: { userId: string }): Promise<{
    session: { userId: string };
    cookies: TestSessionCookie[];
    token: string;
  }>;
}
