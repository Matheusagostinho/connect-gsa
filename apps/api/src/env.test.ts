import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

/**
 * O contrato de ambiente, no que ele PROTEGE.
 *
 * Não é teste de schema Zod: é teste das duas regras cujo descumprimento não dá
 * erro nenhum em produção — some a imagem de todo mundo, ou ninguém consegue
 * ficar logado — e que por isso precisam derrubar o contêiner na subida.
 */
const base = {
  DATABASE_URL: 'postgresql://exemplo/db',
  WEB_ORIGINS: 'https://exemplo.com.br',
  WEB_URL: 'https://exemplo.com.br',
  API_URL: 'https://api.exemplo.com.br',
  BETTER_AUTH_SECRET: 'segredo-de-teste-suficientemente-longo-para-hmac',
  GOOGLE_CLIENT_ID: 'x',
  GOOGLE_CLIENT_SECRET: 'x',
  LINKEDIN_CLIENT_ID: 'x',
  LINKEDIN_CLIENT_SECRET: 'x',
  GITHUB_CLIENT_ID: 'x',
  GITHUB_CLIENT_SECRET: 'x',
};

describe('variáveis de ambiente', () => {
  it('recusa subir em produção sem bucket de imagens', () => {
    // O disco do Cloud Run é efêmero. Sem esta trava, o deploy passa e a foto
    // de perfil de todo mundo vira 404 no primeiro reinício do contêiner.
    expect(() => parseEnv({ ...base, NODE_ENV: 'production' })).toThrow(/MEDIA_BUCKET/);
    expect(() =>
      parseEnv({ ...base, NODE_ENV: 'production', MEDIA_BUCKET: 'balde' }),
    ).toThrow(/MEDIA_PUBLIC_URL/);
  });

  it('sobe em produção com o bucket configurado', () => {
    const env = parseEnv({
      ...base,
      NODE_ENV: 'production',
      MEDIA_BUCKET: 'connect-gsa-media',
      MEDIA_PUBLIC_URL: 'https://storage.googleapis.com/connect-gsa-media',
    });

    expect(env.MEDIA_BUCKET).toBe('connect-gsa-media');
  });

  it('não exige bucket fora de produção', () => {
    // É o que permite desenvolver e rodar a suíte sem credencial do Google.
    expect(parseEnv(base).MEDIA_BUCKET).toBeUndefined();
  });

  it('nunca põe o VALOR da variável na mensagem de erro @principle:P-005', () => {
    const segredo = 'postgresql://usuario:senha-secreta@host/db';

    try {
      parseEnv({ ...base, DATABASE_URL: '', BETTER_AUTH_SECRET: segredo });
      expect.unreachable('deveria ter lançado');
    } catch (erro) {
      // Só os NOMES. Uma mensagem de erro vai para o log do Cloud Run, e log
      // com credencial dentro é vazamento com carimbo de data e hora.
      expect((erro as Error).message).toContain('DATABASE_URL');
      expect((erro as Error).message).not.toContain('senha-secreta');
    }
  });
});
