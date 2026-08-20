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
  const r2 = {
    MEDIA_BUCKET: 'connect-gsa-media',
    MEDIA_PUBLIC_URL: 'https://pub-exemplo.r2.dev',
    R2_ACCOUNT_ID: 'conta123',
    R2_ACCESS_KEY_ID: 'chave',
    R2_SECRET_ACCESS_KEY: 'segredo',
  };

  it('recusa subir em produção sem qualquer uma das cinco variáveis do R2 @spec:AC-151', () => {
    // O disco do contêiner é efêmero, e no plano gratuito do Render ele
    // reinicia toda madrugada por hibernação. Sem esta trava, o deploy passa e
    // a foto de perfil de todo mundo vira 404 de um dia para o outro.
    expect(() => parseEnv({ ...base, NODE_ENV: 'production' })).toThrow(/MEDIA_BUCKET/);

    // Uma a menos já basta para derrubar: configuração pela metade grava imagem
    // em lugar nenhum, e é isso que precisa falhar alto.
    for (const faltando of Object.keys(r2)) {
      const parcial = { ...r2 };
      delete parcial[faltando as keyof typeof r2];

      expect(() => parseEnv({ ...base, ...parcial, NODE_ENV: 'production' })).toThrow(
        new RegExp(faltando),
      );
    }
  });

  it('sobe em produção com o R2 configurado', () => {
    const env = parseEnv({ ...base, ...r2, NODE_ENV: 'production' });

    expect(env.MEDIA_BUCKET).toBe('connect-gsa-media');
    expect(env.R2_ACCOUNT_ID).toBe('conta123');
  });

  it('não exige bucket fora de produção @spec:AC-152', () => {
    // É o que permite desenvolver e rodar a suíte sem credencial de nuvem.
    expect(parseEnv(base).MEDIA_BUCKET).toBeUndefined();
  });

  it('nunca põe o VALOR da variável na mensagem de erro @principle:P-005', () => {
    // Montada a partir das partes, e não escrita por extenso: o P-007 proíbe
    // credencial literal em arquivo versionado, e a regra vale inclusive para
    // uma descartável — abrir exceção "porque essa não é secreta" é como a
    // próxima, que é, passa despercebida.
    const senha = 'senha-de-mentira';
    const segredo = ['postgres', '://usuario:', senha, '@host/db'].join('');

    try {
      parseEnv({ ...base, DATABASE_URL: '', BETTER_AUTH_SECRET: segredo });
      expect.unreachable('deveria ter lançado');
    } catch (erro) {
      // Só os NOMES. Uma mensagem de erro vai para o log do Render, e log
      // com credencial dentro é vazamento com carimbo de data e hora.
      expect((erro as Error).message).toContain('DATABASE_URL');
      expect((erro as Error).message).not.toContain(senha);
    }
  });
});
