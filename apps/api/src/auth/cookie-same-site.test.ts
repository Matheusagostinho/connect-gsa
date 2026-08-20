import { describe, expect, it } from 'vitest';
import { parseEnv } from '../env.js';
import { testEnv } from '../testing/app.js';
import { buildAuthOptions } from './better-auth.js';
import { testDb } from '../testing/db.js';

/**
 * O `SameSite` do cookie de sessão.
 *
 * Este teste existe por causa de um defeito que só aparece em PRODUÇÃO e não
 * dá erro nenhum: com `lax` e o SPA num site diferente do da API, o navegador
 * manda o cookie na volta do OAuth (navegação de topo) e não manda em nenhuma
 * chamada de dado depois. O login parece dar certo e o aplicativo abre
 * deslogado. Em desenvolvimento tudo é `localhost` atrás do proxy do Vite, e o
 * problema não existe.
 *
 * O que se guarda aqui é o padrão seguro e a trava que impede a configuração
 * inútil (`none` sem `secure`, que o navegador descarta em silêncio).
 */
const ambienteMinimo = {
  DATABASE_URL: 'postgresql://exemplo/db',
  WEB_ORIGINS: 'http://localhost:5173',
  WEB_URL: 'http://localhost:5173',
  API_URL: 'http://localhost:3333',
  BETTER_AUTH_SECRET: 'segredo-de-teste-suficientemente-longo-para-hmac',
  GOOGLE_CLIENT_ID: 'x',
  GOOGLE_CLIENT_SECRET: 'x',
  LINKEDIN_CLIENT_ID: 'x',
  LINKEDIN_CLIENT_SECRET: 'x',
  GITHUB_CLIENT_ID: 'x',
  GITHUB_CLIENT_SECRET: 'x',
};

describe('SameSite do cookie de sessão', () => {
  it('é `lax` quando ninguém diz o contrário', () => {
    // O padrão precisa ser o SEGURO: quem publica em site único não deve
    // precisar saber que esta variável existe.
    expect(parseEnv(ambienteMinimo).COOKIE_SAME_SITE).toBe('lax');
  });

  it('recusa qualquer valor fora de lax e none', () => {
    expect(() => parseEnv({ ...ambienteMinimo, COOKIE_SAME_SITE: 'strict' })).toThrow(
      /COOKIE_SAME_SITE/,
    );
  });

  it('`none` implica `secure`, mesmo fora de produção @principle:P-008', () => {
    const opcoes = buildAuthOptions(testDb(), { ...testEnv, COOKIE_SAME_SITE: 'none' });

    // Sem `secure`, o navegador DESCARTA um cookie `SameSite=None` sem avisar —
    // configurar um sem o outro seria pior que não configurar nada.
    expect(opcoes.advanced.defaultCookieAttributes).toMatchObject({
      sameSite: 'none',
      secure: true,
      httpOnly: true,
    });
  });

  it('mantém o cookie inacessível ao JavaScript em qualquer configuração @principle:P-008', () => {
    for (const sameSite of ['lax', 'none'] as const) {
      const opcoes = buildAuthOptions(testDb(), { ...testEnv, COOKIE_SAME_SITE: sameSite });
      expect(opcoes.advanced.defaultCookieAttributes.httpOnly).toBe(true);
    }
  });
});
